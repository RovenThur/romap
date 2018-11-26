import * as React from 'react';
import { mapContext } from '../MapContext';

export class MapResizer extends React.Component<{}, {}> {
  public static contextType = mapContext;

  constructor(props: {}) {
    super(props);
    window.addEventListener('resize', this.updateSize.bind(this));
  }

  public updateSize() {
    const olMap = this.context.olMap;
    const targetElement = olMap.getTargetElement() as HTMLElement;
    if (targetElement) {
      const w = targetElement.parentElement.offsetWidth;
      const h = targetElement.parentElement.offsetHeight;
      targetElement.style.width = `${w}px`;
      targetElement.style.height = `${h}px`;
      olMap.setSize([w, h]);
    }
  }

  public render(): any {
    return null;
  }
}
