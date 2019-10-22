import * as React from 'react';
import { createGlobalStyle } from 'styled-components';
import OlMap from 'ol/Map';
import OlView from 'ol/View';
import OlProjection from 'ol/proj/Projection';
import { romapContext } from './RomapContext';
import { IBaseToolProps, BaseTool } from './tool/BaseTool';
import { BaseContainer } from './container/BaseContainer';
import { LayersManager } from './LayersManager';
import { ToolsManager } from './ToolsManager';
import { Projection } from './Projection';

const GlobalStyle = createGlobalStyle`
.ol-unsupported {
  display: none;
}

.ol-viewport, .ol-unselectable {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: rgba(0,0,0,0);
}

.ol-selectable {
  -webkit-touch-callout: default;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
}

.ol-control {
  position: absolute;
}

.ol-hidden {
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.25s linear 0s, visibility 0s linear 0.25s;
}
`;

export interface IRomapProps {
  /**
  * unique id is mandatory.
  */
  uid: React.Key;
  /**
   * Children.
   */
  children: React.ReactNode;
  /**
   * Class name.
   */
  className?: string;
  /**
   * Style.
   */
  style?: React.CSSProperties;
  /**
   * Style.
   */
  olMapStyle?: React.CSSProperties;
  /**
   * Keyboard Event Target.
   */
  keyboardEventTarget?: any;
  /**
   * Initial view center.
   */
  initialViewCenter?: [number, number];
  /*
   * Initial view zoom.
   */
  initialViewZoom?: number;
  /*
   * Initial view resolution.
   */
  initialViewResolution?: number;
  /*
   * Initial view rotation.
   */
  initialViewRotation?: number;
  /*
   * Initial view projection.
   */
  initialViewProjection?: OlProjection | string;
  /*
   * Ignore default interactions.
   */
  ignoreDefaultInteractions?: boolean;
}

export interface IRomapState {
  /**
   * Changed counter.
   */
  changedCounter: number;
}

export class Romap extends React.Component<IRomapProps, IRomapState> {
  public static defaultProps = {
    className: 'map'
  };

  /**
   * OpenLayers map.
   */
  private olMap: OlMap;

  /**
   * OpenLayers view.
   */
  private olView: OlView;

  /**
   * Div.
   */
  private divMap: any;

  /**
   * Layers manager.
   */
  private layersManager: LayersManager;

  /**
   * Tools manager.
   */
  private toolsManager: ToolsManager;

  constructor(props: IRomapProps) {
    super(props);
    this.state = { changedCounter: 0 };
    if (props.ignoreDefaultInteractions === true) {
      this.olMap = new OlMap({
        controls: [],
        interactions: [],
        keyboardEventTarget: props.keyboardEventTarget
      });
    } else {
      this.olMap = new OlMap({
        controls: [],
        keyboardEventTarget: props.keyboardEventTarget
      });
    }
    this.olView = new OlView({
      center: [0, 0],
      zoom: 2
    });
    this.olMap.setView(this.olView);
    this.layersManager = new LayersManager(props.uid, this.refresh);
    this.toolsManager = new ToolsManager(props.uid, this.refresh);
  }

  public componentDidMount() {
    this.olMap.setTarget(this.divMap);
    this.layersManager.fromChildren(this.props.children);
    this.toolsManager.fromChildren(this.props.children);
    // View
    if (this.props.initialViewCenter != null && this.props.initialViewZoom != null) {
      const view = new OlView({
        center: this.props.initialViewCenter,
        zoom: this.props.initialViewZoom,
        resolution: this.props.initialViewResolution,
        rotation: this.props.initialViewRotation,
        projection: this.props.initialViewProjection
      });
      this.olMap.setView(view);
    }
  }

  public componentDidUpdate(prevProps: IRomapProps, prevState: IRomapState, snapshot: any) {
    this.layersManager.fromChildren(this.props.children);
    this.toolsManager.fromChildren(this.props.children);
  }

  public refresh = () => {
    this.setState((prevState: IRomapState) => {
      return { changedCounter: prevState.changedCounter + 1 };
    });
  };

  public renderProjections(): React.ReactElement<IBaseToolProps>[] {
    const elems: React.ReactElement<IBaseToolProps>[] = [];
    // Projection
    React.Children.map(this.props.children, (child: React.ReactElement<any>) => {
      if (child != null && Projection === child.type) {
        elems.push(child);
      }
    });
    return elems;
  }

  public renderChildren(): React.ReactElement<any>[] {
    const elems: React.ReactElement<any>[] = [];
    // Layers
    this.layersManager.getLayerElements().forEach(layerElement => {
      elems.push(layerElement.reactElement);
    });
    // Tools
    React.Children.map(this.props.children, (child: React.ReactElement<any>) => {
      if (child != null && BaseTool.isPrototypeOf(child.type)) {
        elems.push(child);
      }
    });
    // Containers
    React.Children.map(this.props.children, (child: React.ReactElement<any>) => {
      if (child != null && BaseContainer.isPrototypeOf(child.type)) {
        elems.push(child);
      }
    });
    return elems;
  }

  public render(): React.ReactNode {
    return (
      <div className={this.props.className} style={this.props.style}>
        <GlobalStyle />
        {this.renderProjections()}
        <div
          ref={divMap => {
            this.divMap = divMap;
          }}
          className={`${this.props.className}-olmap`}
          style={this.props.olMapStyle}
        />
        <romapContext.Provider
          value={{
            olMap: this.olMap,
            olGroup: this.olMap.getLayerGroup(),
            layersManager: this.layersManager,
            toolsManager: this.toolsManager,
            getLocalizedText: (code: string, defaultText: string, data?: { [key: string]: string }) => {
              return defaultText;
            }
          }}
        >
          {this.renderChildren()}
        </romapContext.Provider>
      </div>
    );
  }
}
