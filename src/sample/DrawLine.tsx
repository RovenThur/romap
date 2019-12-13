import * as React from 'react';
import styled from 'styled-components';
import { IBaseButtonToolProps, BaseButtonTool } from '../tool';
import { IRomapContext, romapContext } from '../RomapContext';
import { LocalVector } from '../source';
import Draw from 'ol/interaction/Draw';
import GeometryType from 'ol/geom/GeometryType';
import { getDefaultLayerStyles } from '../utils';

const Container = styled.div`
  margin: 2px;
  display: flex;
  flex-direction: column;
`;

// unique global draw interaction
let draw: Draw = null;

export class DrawLine extends BaseButtonTool<IBaseButtonToolProps, any> {
  public static contextType: React.Context<IRomapContext> = romapContext;

  public context: IRomapContext;

  public toolDidActivate(): void {
    if (draw == null) {
      draw = this.buildDrawInteractionAndLayer();
      this.context.olMap.addInteraction(draw);
    }
  }

  public toolDidDeactivate(): void {
    if (draw != null) {
      this.context.olMap.removeInteraction(draw);
      draw = null;
    }
  }

  public buildDrawInteractionAndLayer(): Draw {
    const props = {
      uid: 'drawline_tool_layer',
      name: 'Line',
      layerStyles: getDefaultLayerStyles()
    };
    const localVectorSource = this.context.layersManager.createAndAddLayerFromSource(
      'identifyVector',
      {},
      props
    ) as LocalVector;
    return new Draw({
      source: localVectorSource,
      type: GeometryType.LINE_STRING
    });
  }

  public renderTool(): React.ReactNode {
    return <span>Draw line</span>;
  }
}
