import * as React from 'react';
import OlMap from 'ol/Map';
import OlView from 'ol/View';
import OlBaseLayer from 'ol/layer/Base';
import { BaseLayer, IBaseLayerProps, Vector, Tile, Image } from './layer';
import { jsonEqual, walk } from './utils';
import { ISnapshotGetter, ISnapshot, ISnapshotLayer, ISnapshotProjection } from './ISnapshot';
import {
  IExtended,
  ExternalVector,
  ImageStatic,
  ImageWms,
  LocalVector,
  QueryArcGISRest,
  TileArcGISRest,
  TileWms,
  Wfs,
  Xyz,
  ImageArcGISRest
} from './source';
import { getProjectionInfos, addProjection } from './Projection';

export type layerElementStatus = null | 'react' | 'ext' | 'del';

export interface ILayerElement {
  /**
   * React Element.
   */
  reactElement: Readonly<React.ReactElement>;
  /**
   * Unique id.
   */
  uid: Readonly<React.Key>;
  /**
   * Updated props.
   */
  updatedProps: any;
  /**
   * Status.
   */
  status: Readonly<layerElementStatus>;
  /**
   * Openlayers layer.
   */
  olLayer?: OlBaseLayer;
}

const layerMaps = new Map<React.Key, Map<React.Key, ILayerElement>>();

export class LayersManager {
  private uid: React.Key;

  private olMap: OlMap;

  private refresh: () => void;

  private snapshotGetter: ISnapshotGetter;

  constructor(uid: React.Key, olMap: OlMap, refresh: () => void, snapshotGetter: ISnapshotGetter) {
    this.uid = uid;
    this.olMap = olMap;
    this.refresh = refresh;
    this.snapshotGetter = snapshotGetter;
    if (this.snapshotGetter) {
      this.snapshotGetter.getSnapshot = this.getSnapshot;
    }
    layerMaps.set(uid, new Map<React.Key, ILayerElement>());
  }

  /**
   * Get Openlayers map.
   */
  public getOlMap(): OlMap {
    return this.olMap;
  }

  /**
   * Get snapshot.
   */
  public getSnapshot = (): ISnapshot => {
    // View
    const olView = this.olMap.getView();
    const view = {
      center: olView.getCenter() as [number, number],
      zoom: olView.getZoom(),
      projectionCode: olView.getProjection().getCode()
    };
    // Projections
    const projections: Array<ISnapshotProjection> = [];
    getProjectionInfos().map(projectionInfo => {
      projections.push({
        code: projectionInfo.code,
        name: projectionInfo.name,
        lonLatValidity: projectionInfo.lonLatValidity,
        remarks: projectionInfo.remarks,
        wkt: projectionInfo.wkt
      });
    });
    // Layers
    const layers: Array<ISnapshotLayer> = [];
    this.getLayerElements().map(layerElement => {
      const props = { ...layerElement.reactElement.props };
      const source = props['source'];
      if (
        source != null &&
        'getSourceTypeName' in source &&
        'getSourceOptions' in source &&
        'isSnapshotable' in source
      ) {
        if ((source as IExtended).isSnapshotable()) {
          props['source'] = undefined;
          props['children'] = undefined;
          layers.push({
            sourceTypeName: (source as IExtended).getSourceTypeName(),
            sourceOptions: (source as IExtended).getSourceOptions(),
            props
          });
        }
      }
    });
    return {
      view,
      projections,
      layers
    };
  };

  /**
   * Reload from snapshot.
   */
  public reloadFromSnapshot = (snapshot: ISnapshot) => {
    // Remove old
    this.getLayerElements().map(layerElement => {
      this.setLayerElement(
        {
          ...layerElement,
          status: 'del'
        },
        false
      );
    });
    // Projections
    snapshot.projections.forEach(projection => {
      addProjection(projection.code, projection.wkt, projection.lonLatValidity, projection.name, projection.remarks);
    });
    // View
    this.olMap.setView(
      new OlView({
        center: snapshot.view.center,
        zoom: snapshot.view.zoom,
        projection: snapshot.view.projectionCode
      })
    );
    // Layers
    snapshot.layers.forEach(layer => {
      this.createAndAddLayerFromSource(layer.sourceTypeName, layer.sourceOptions, layer.props);
    });
    // Refresh
    this.refresh();
  };

  /**
   * Get infoElements
   */
  public getLayerElements(
    filterFn?: (value: ILayerElement, index: number, array: ILayerElement[]) => boolean,
    thisFilterArg?: any
  ): ILayerElement[] {
    const layerMap = layerMaps.get(this.uid);
    if (layerMap == null) {
      return [];
    }
    const arr = Array.from(layerMap.values()).filter(layerElement => layerElement.status !== 'del');
    return filterFn == null ? arr : arr.filter(filterFn, thisFilterArg);
  }

  /**
   * Update layer props
   */
  public updateLayerProps(uid: React.Key, props: any, refreshIfChanging = true) {
    const layerElement = this.getLayerElements(layerElement => layerElement.uid == uid).pop();
    if (layerElement != null) {
      this.setLayerElement(
        {
          ...layerElement,
          reactElement: React.cloneElement(layerElement.reactElement, {
            ...layerElement.reactElement.props,
            ...props,
            uid,
            key: uid
          }),
          updatedProps: { ...layerElement.updatedProps, ...props }
        },
        refreshIfChanging
      );
    } else {
      console.error(`Element not found for uid ${uid}`);
    }
  }

  /**
   * Set Openlayers layer
   */
  public setOlLayer(uid: React.Key, olLayer: OlBaseLayer) {
    const layerElement = this.getLayerElements(layerElement => layerElement.uid == uid).pop();
    if (layerElement != null) {
      layerElement.olLayer = olLayer;
      layerElement.olLayer.set('uid', uid, true);
    } else {
      console.error(`Element not found for uid ${uid}`);
    }
  }

  /**
   * Get Openlayers layer
   */
  public getOlLayer(uid: React.Key): OlBaseLayer {
    const layerElement = this.getLayerElements(layerElement => layerElement.uid == uid).pop();
    if (layerElement != null) {
      return layerElement.olLayer;
    } else {
      console.error(`Element not found for uid ${uid}`);
      return null;
    }
  }

  /**
   * Create and add layer props
   */
  public createAndAddLayer(
    cl: React.ClassType<IBaseLayerProps, BaseLayer<IBaseLayerProps, any, any, any>, any>,
    props: IBaseLayerProps
  ) {
    const reactElement = React.createElement(cl, {
      ...props,
      key: props.uid
    });
    this.setLayerElement({
      reactElement,
      uid: props.uid,
      updatedProps: {},
      status: 'ext'
    });
  }

  /**
   * Create and add layer props
   */
  public createAndAddLayerFromSource(sourceTypeName: string, sourceOptions: any, props: IBaseLayerProps): IExtended {
    const layerElement = this.getLayerElements(layerElement => layerElement.uid == props.uid).pop();
    if (layerElement != null) {
      if (layerElement.olLayer != null) {
        return 'getSource' in layerElement.olLayer ? (layerElement.olLayer as any).getSource() : null;
      } else {
        let found: OlBaseLayer;
        walk(this.olMap, (currentOlLayer: OlBaseLayer) => {
          if (currentOlLayer.get('uid') === props.uid) {
            this.setOlLayer(props.uid, currentOlLayer);
            found = currentOlLayer;
          }
          return true;
        });
        return found != null && 'getSource' in found ? (found as any).getSource() : null;
      }
    }
    let source: IExtended;
    switch (sourceTypeName) {
      case 'ExternalVector':
        source = new ExternalVector(sourceOptions);
        this.createAndAddLayer(Vector, { ...props, source });
        break;
      case 'ImageArcGISRest':
        source = new ImageArcGISRest(sourceOptions);
        this.createAndAddLayer(Image, { ...props, source });
        break;
      case 'ImageStatic':
        source = new ImageStatic(sourceOptions);
        this.createAndAddLayer(Image, { ...props, source });
        break;
      case 'ImageWms':
        source = new ImageWms(sourceOptions);
        this.createAndAddLayer(Image, { ...props, source });
        break;
      case 'LocalVector':
        source = new LocalVector(sourceOptions);
        this.createAndAddLayer(Vector, { ...props, source });
        break;
      case 'QueryArcGISRest':
        source = new QueryArcGISRest(sourceOptions);
        this.createAndAddLayer(Vector, { ...props, source });
        break;
      case 'TileArcGISRest':
        source = new TileArcGISRest(sourceOptions);
        this.createAndAddLayer(Tile, { ...props, source });
        break;
      case 'TileWms':
        source = new TileWms(sourceOptions);
        this.createAndAddLayer(Tile, { ...props, source });
        break;
      case 'Wfs':
        source = new Wfs(sourceOptions);
        this.createAndAddLayer(Vector, { ...props, source });
        break;
      case 'Xyz':
        source = new Xyz(sourceOptions);
        this.createAndAddLayer(Tile, { ...props, source });
        break;
    }
    return source;
  }

  /**
   * Update from children
   */
  public fromChildren(nextChildren: React.ReactNode) {
    const layerMap = layerMaps.get(this.uid);
    if (layerMap == null) {
      return;
    }
    const toDel = new Set<React.Key>();
    // Old children
    this.getLayerElements(layerElement => layerElement.status === 'react').map(layerElement => {
      toDel.add(layerElement.uid);
    });
    // Next children
    if (nextChildren) {
      React.Children.map(nextChildren, (nextChild: React.ReactElement<any>) => {
        if (nextChild != null && BaseLayer.isPrototypeOf(nextChild.type)) {
          const uid = nextChild.props.uid;
          // uid is null: log error
          if (uid == null) {
            console.error('Unique id is mandatory');
          } else {
            const layerElement = layerMap.get(uid);
            if (layerElement == null || layerElement.status === 'react') {
              if (toDel.has(uid)) {
                toDel.delete(uid);
              }
              const props = {
                ...nextChild.props,
                ...(layerElement != null ? layerElement.updatedProps : {}),
                key: uid
              };
              this.setLayerElement({
                reactElement: React.cloneElement(nextChild, props),
                status: 'react',
                updatedProps: layerElement != null ? layerElement.updatedProps : {},
                uid
              });
              if (layerElement != null) {
                this.setOlLayer(uid, layerElement.olLayer);
              }
            }
          }
        }
      });
    }
    // Set status to 'del' removed children
    toDel.forEach((uid: React.Key) => {
      const layerElement = this.getLayerElements(layerElement => layerElement.uid == uid).pop();
      if (layerElement != null) {
        layerElement.status = 'del';
      }
    });
  }

  /**
   * Set layerElement
   */
  private setLayerElement(layerElement: ILayerElement, refreshIfChanging = true) {
    const layerMap = layerMaps.get(this.uid);
    if (layerMap == null) {
      return false;
    }
    const found = layerMap.get(layerElement.uid);
    let changed = false;
    if (!found) {
      if (layerElement.status !== 'del') {
        layerMap.set(layerElement.uid, {
          ...layerElement
        });
        changed = true;
      }
    } else {
      if (layerElement.status === 'del') {
        if (found.status === 'react') {
          layerMap.set(layerElement.uid, {
            ...layerElement,
            status: 'del'
          });
          changed = true;
        } else if (found.status === 'ext') {
          layerMap.delete(layerElement.uid);
          changed = true;
        }
      } else {
        layerMap.set(layerElement.uid, {
          ...layerElement
        });
        changed = !jsonEqual(found.reactElement.props, layerElement.reactElement.props, ['source', 'children']);
      }
    }
    if (refreshIfChanging && changed) {
      this.refresh();
    }
  }
  }
