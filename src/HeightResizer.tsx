import * as React from 'react';
import { romapContext, IRomapContext } from './RomapContext';

export interface IResizerProps {
  /**
   * Height percent.
   */
  heightPercent?: number;
  /**
   * Height removal.
   */
  heightRemoval?: string;
}

export class HeightResizer extends React.Component<IResizerProps, {}> {
  public static contextType: React.Context<IRomapContext> = romapContext;

  public static defaultProps = {
    heightPercent: 100,
    heightRemoval: '15px'
  };

  public context: IRomapContext;

  public componentDidMount() {
    window.addEventListener('resize', this.updateSize);
    setTimeout(() => {
      this.updateSize();
    }, 1000);
  }

  public componentDidUpdate() {
    this.updateSize();
  }

  public componentWillUnmount() {
    window.removeEventListener('resize', this.updateSize);
  }

  public updateSize = () => {
    const olMap = this.context.olMap;
    const targetElement = olMap.getTargetElement() as HTMLElement;
    if (targetElement) {
      targetElement.parentElement.style.height = `calc(${this.props.heightPercent}% - ${this.props.heightRemoval})`;
      const w = targetElement.offsetWidth;
      const h = targetElement.parentElement.offsetHeight;
      targetElement.style.height = `${h}px`;
      olMap.setSize([w, h]);
    }
  };

  public render(): React.ReactNode {
    return null;
  }
}
