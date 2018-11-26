import * as React from 'react';
import OlControl from 'ol/control/Control';
import { mapContext } from '../MapContext';

export interface IControlProps {
  /**
   * Content.
   */
  children?: React.ReactElement<any> | Array<React.ReactElement<any>>;
}

export interface IControlState {
  /**
   * Control.
   */
  control: OlControl;
}

export class Control extends React.Component<IControlProps, IControlState> {
  public static contextType = mapContext;

  /**
   * Control div.
   */
  private controlDiv: any;

  constructor(props: IControlProps) {
    super(props);
    this.state = {
      control: null
    };
  }

  public componentDidMount() {
    this.componentDidUpdate();
  }

  public componentDidUpdate() {
    if (this.controlDiv != null && this.state.control == null) {
      this.createControl();
    }
  }

  public componentWillUnmount() {
    this.context.olMap.removeControl(this.state.control);
  }

  public createControl() {
    const control = new OlControl({
      element: this.controlDiv.children[0],
      target: this.context.olMap.getOverlayContainer()
    });
    this.context.olMap.addControl(control);
    this.setState({
      control
    });
  }

  public render(): any {
    let children = null;
    if (this.state.control != null) {
      children = this.props.children;
    }
    return (
      <div style={{ display: 'none' }}>
        <div
          ref={(controlDiv: any) => {
            this.controlDiv = controlDiv;
          }}
        >
          <div>{children}</div>
        </div>
      </div>
    );
  }
}
