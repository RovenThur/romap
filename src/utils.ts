import OlMap from 'ol/Map';
import OlGroupLayer from 'ol/layer/Group';
import OlBaseLayer from 'ol/layer/Base';
import OlView from 'ol/View';
import OlGeometry from 'ol/geom/Geometry';
import OlSimpleGeometry from 'ol/geom/SimpleGeometry';
import { IFeatureType, LocalVector } from './source';
import { LayersManager } from './LayersManager';
import KML from 'ol/format/KML';
import GeoJSON, { GeoJSONGeometry } from 'ol/format/GeoJSON';
import Feature from 'ol/Feature';
import * as JSZip from 'jszip';
import { LayerStyles } from './LayerStyles';
import { fromCircle } from 'ol/geom/Polygon';
import Circle from 'ol/geom/Circle';
import booleanDisjoint from '@turf/boolean-disjoint';
import * as shapefile2geojson from 'shapefile2geojson';
import { addProjection } from './Projection';

const geoJSONFormat = new GeoJSON();
const kmlFormat = new KML({ extractStyles: true, showPointNames: false });

/**
 * Walk recursivly.
 * @param  {OlMap | LayerGroup} map or group
 * @param  {Function} fn callback function
 */
export function walk(
  top: OlMap | OlGroupLayer,
  fn: (layer: OlBaseLayer, idx: number, parent: OlGroupLayer) => boolean
) {
  const group = top instanceof OlMap ? top.getLayerGroup() : top;
  if (group == null) {
    return;
  }
  group.getLayers().forEach((layer: OlBaseLayer, idx: number) => {
    if (layer) {
      const cont = fn(layer, idx, group);
      if (cont !== false && layer instanceof OlGroupLayer) {
        walk(layer, fn);
      }
    }
  });
}

/**
 * Clone view.
 * @param {OlView} view
 */
export function cloneView(view: OlView) {
  const center = view.getCenter();
  const newCenter = [center[0], center[1]] as [number, number];
  return new OlView({
    center: newCenter,
    zoom: view.getZoom(),
    resolution: view.getResolution(),
    rotation: view.getRotation(),
    projection: view.getProjection(),
    maxResolution: view.getMaxResolution(),
    minResolution: view.getMinResolution(),
    maxZoom: view.getMaxZoom(),
    minZoom: view.getMinZoom(),
    resolutions: view.getResolutions()
  });
}

/**
 * Reverse coordinates.
 * @param {OlSimpleGeometry} geometry
 */
export function revertCoordinate(geometry: OlSimpleGeometry) {
  return geometry.applyTransform((input: number[], ouput: number[], dimension: number) => {
    for (let i = 0; i < input.length; i += dimension) {
      const y = input[i];
      const x = input[i + 1];
      ouput[i] = x;
      ouput[i + 1] = y;
    }
    return ouput;
  });
}

/**
 * Transform OpenLayers geometry to GeoJSON geometry
 * @param geometry OpenLayers geometry
 */
export function toGeoJSONGeometry(geometry: OlGeometry): GeoJSONGeometry {
  if (geometry.getType() === 'Circle') {
    geometry = fromCircle(geometry as Circle);
  }
  return (geoJSONFormat.writeGeometryObject(geometry) as any) as GeoJSONGeometry;
}

/**
 * Check if two geojson geometries are disjoint
 * @param g1 GeoJSON geometry
 * @param g2 GeoJSON geometry
 */
export function disjoint(g1: GeoJSONGeometry, g2: GeoJSONGeometry) {
  return booleanDisjoint(g1 as any, g2 as any);
}

/**
 * Get replacer for stringify.
 */
function getCircularReplacer() {
  const seen: any[] = [];
  return (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      const idx = seen.indexOf(value);
      if (idx !== -1) {
        return `[Circular ~.${idx}]`;
      }
      seen.push(value);
    }
    return value;
  };
}

/**
 * Perform JSON equal.
 * @param obj1 object 1
 * @param obj2 object 2
 * @param ignore list of ignored attribute
 */
export function jsonEqual(obj1: any, obj2: any, ignore?: string[]): boolean {
  if (obj1 === obj2) {
    return true;
  }
  if (obj1 == null || obj2 == null) {
    return false;
  }
  let str1 = '';
  let obj = { ...obj1 };
  if (ignore != null) {
    for (const key of ignore) {
      obj[key] = null;
    }
  }
  try {
    str1 = JSON.stringify(obj, getCircularReplacer());
  } catch (error) {
    console.error(error, obj);
  }
  let str2 = '';
  obj = { ...obj2 };
  if (ignore != null) {
    for (const key of ignore) {
      obj[key] = null;
    }
  }
  try {
    str2 = JSON.stringify(obj, getCircularReplacer());
  } catch (error) {
    console.error(error, obj);
  }
  return str1 === str2;
}

/**
 * Generate unique id.
 */
export function uid(): React.Key {
  globalKey++;
  let d = new Date().getTime();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    d += performance.now(); //use high-precision timer if available
  }
  return (
    'xxxxxxxxxxxxxxxy'.replace(/[xy]/g, function(c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    }) + globalKey.toString(16)
  );
}
let globalKey = 0;

/**
 * Generate LAYERS param from IFeatureType array.
 */
export function getLayersFromTypes(types: IFeatureType<string>[]): string {
  if (types == null || types.length === 0) {
    return undefined;
  } else {
    return types.map(t => t.id).join(',');
  }
}

export function getDefaultLayerStyles(): LayerStyles {
  return [
    {
      type: 'circle',
      paint: {
        'circle-color': 'rgba(127, 127, 127, 0.2)',
        'circle-stroke-color': 'rgba(0, 0, 0, 0.9)',
        'circle-radius': 3,
        'circle-stroke-width': 2
      }
    },
    {
      type: 'line',
      paint: {
        'line-color': 'rgba(0, 0, 255, 0.9)',
        'line-cap': 'butt',
        'line-join': 'miter',
        'line-width': 2
      }
    },
    {
      type: 'fill',
      paint: {
        'fill-color': 'rgba(127, 127, 127, 0.2)'
      }
    }
  ];
}

/**
 * Load KML from file.
 */
export function loadKML(file: File, layersManager: LayersManager): Promise<React.Key> {
  return new Promise<React.Key>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const kmlString = reader.result as string;
      const name = `${kmlFormat.readName(kmlString)} (${file.name})`;
      const features: Feature[] = kmlFormat.readFeatures(kmlString, {
        featureProjection: layersManager
          .getOlMap()
          .getView()
          .getProjection()
      }) as Feature[];
      const layerProps = {
        uid: uid(),
        name,
        layerStyles: getDefaultLayerStyles(),
        type: 'OVERLAY'
      };
      const localVectorSource = layersManager.createAndAddLayerFromSource('LocalVector', {}, layerProps) as LocalVector;
      localVectorSource.addFeatures(features);
      resolve(layerProps.uid);
    };
    reader.readAsText(file);
  });
}

/**
 * Load KMZ from file.
 */
export function loadKMZ(file: File, layersManager: LayersManager): Promise<React.Key> {
  return new Promise<React.Key>((resolve, reject) => {
    const zipFile = new JSZip();
    zipFile.loadAsync(file).then(zip => {
      const promises = Object.keys(zip.files)
        .map(name => zip.files[name])
        .map(
          entry =>
            new Promise<{ name: string; data: string }>((resolve, reject) => {
              entry.async('blob').then(blob => {
                if (/\.(jpe?g|png|gif|bmp)$/i.test(entry.name)) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    resolve({
                      name: entry.name,
                      data: reader.result as any
                    });
                  };
                  reader.readAsDataURL(blob);
                } else {
                  const reader = new FileReader();
                  reader.onload = () => {
                    resolve({
                      name: entry.name,
                      data: reader.result as any
                    });
                  };
                  reader.readAsText(blob);
                }
              });
            })
        );
      Promise.all(promises).then(
        elements => {
          const imageElements = elements.filter(element => /\.(jpe?g|png|gif|bmp)$/i.test(element.name));
          const docElement = elements.filter(element => element.name === 'doc.kml').pop();
          let kmlString = docElement.data;
          imageElements.forEach(imageElement => {
            const name = imageElement.name.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
            kmlString = kmlString.replace(new RegExp(name, 'g'), imageElement.data);
          });
          const name = `${kmlFormat.readName(kmlString)} (${file.name})`;
          const features: Feature[] = kmlFormat.readFeatures(kmlString, {
            featureProjection: layersManager
              .getOlMap()
              .getView()
              .getProjection()
          }) as Feature[];
          const layerProps = {
            uid: uid(),
            name,
            layerStyles: getDefaultLayerStyles(),
            type: 'OVERLAY'
          };
          const localVectorSource = layersManager.createAndAddLayerFromSource(
            'LocalVector',
            {},
            layerProps
          ) as LocalVector;
          localVectorSource.addFeatures(features);
          resolve(layerProps.uid);
        },
        err => {
          reject(err);
        }
      );
    });
  });
}

/**
 * Load zipped Shapefile from file.
 */
export function loadZippedShapefile(file: File, layersManager: LayersManager): Promise<React.Key> {
  return new Promise<React.Key>((resolve, reject) => {
    const zipFile = new JSZip();
    zipFile.loadAsync(file).then(
      zip => {
        const promises = Object.keys(zip.files)
          .map(name => zip.files[name])
          .map(
            entry =>
              new Promise<{ name: string; data: string }>((resolve, reject) => {
                entry.async('blob').then(blob => {
                  if (entry.name.endsWith('.prj')) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      resolve({
                        name: entry.name,
                        data: reader.result as any
                      });
                    };
                    reader.readAsText(blob);
                  } else {
                    const reader = new FileReader();
                    reader.onload = () => {
                      resolve({
                        name: entry.name,
                        data: reader.result as any
                      });
                    };
                    reader.readAsArrayBuffer(blob);
                  }
                });
              })
          );
        Promise.all(promises).then(elements => {
          const dbfElement = elements.filter(element => element.name.endsWith('.dbf')).pop();
          const shpElement = elements.filter(element => element.name.endsWith('.shp')).pop();
          const prjElement = elements.filter(element => element.name.endsWith('.prj')).pop();
          const featureCollection = shapefile2geojson(shpElement.data, dbfElement.data);
          const name = shpElement.name;
          const featureProjection = layersManager
            .getOlMap()
            .getView()
            .getProjection();
          let dataProjection = featureProjection;
          if (prjElement != null) {
            dataProjection = addProjection(prjElement.name, prjElement.data).olProjection;
          }
          const features: Feature[] = geoJSONFormat.readFeatures(featureCollection, {
            dataProjection,
            featureProjection
          }) as Feature[];
          const layerProps = {
            uid: uid(),
            name,
            layerStyles: getDefaultLayerStyles(),
            type: 'OVERLAY'
          };
          const localVectorSource = layersManager.createAndAddLayerFromSource(
            'LocalVector',
            {},
            layerProps
          ) as LocalVector;
          localVectorSource.addFeatures(features);
          resolve(null);
        });
      },
      err => {
        reject(err);
      }
    );
  });
}

/**
 * Load WMS.
 */
export function loadWMS(
  title: string,
  serverUrl: string,
  types: IFeatureType<string>[],
  gisProxyUrl: string,
  layersManager: LayersManager
): Promise<React.Key> {
  return new Promise<React.Key>(resolve => {
    let url = serverUrl;
    if (gisProxyUrl != null && gisProxyUrl !== '') {
      url = `${gisProxyUrl}/${btoa(serverUrl)
        .replace('=', '%3D')
        .replace('/', '%2F')
        .replace('+', '%2B')}`;
    }
    const layerProps = {
      uid: uid(),
      name: title,
      type: 'OVERLAY'
    };
    layersManager.createAndAddLayerFromSource('ImageWms', { types, url }, layerProps);
    resolve(layerProps.uid);
  });
}
