import * as React from 'react';
import { Romap } from '../Romap';
import { CounterButton } from './CounterButton';
import { CounterWindow } from './CounterWindow';
import { QueryWindow } from './QueryWindow';
import { HideToolsButton } from './HideToolsButton';
import { TileArcGISRest, ImageStatic, TileWms, Xyz } from '../source';
import { LayerLoader, Toc, ScaleLine, PanZoom } from '../tool';
import { Image, Tile } from '../layer';
import { Projection } from '../Projection';
import { Control, Zone } from '../container';

const wkt2154 =
  'PROJCS["RGF93 / Lambert-93",GEOGCS["RGF93",DATUM["Reseau_Geodesique_Francais_1993",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],TOWGS84[0,0,0,0,0,0,0],AUTHORITY["EPSG","6171"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.01745329251994328,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4171"]],UNIT["metre",1,AUTHORITY["EPSG","9001"]],PROJECTION["Lambert_Conformal_Conic_2SP"],PARAMETER["standard_parallel_1",49],PARAMETER["standard_parallel_2",44],PARAMETER["latitude_of_origin",46.5],PARAMETER["central_meridian",3],PARAMETER["false_easting",700000],PARAMETER["false_northing",6600000],AUTHORITY["EPSG","2154"],AXIS["X",EAST],AXIS["Y",NORTH]]';
const wkt27700 =
  'PROJCS["OSGB 1936 / British National Grid",GEOGCS["OSGB 1936",DATUM["OSGB_1936",SPHEROID["Airy 1830",6377563.396,299.3249646,AUTHORITY["EPSG","7001"]],AUTHORITY["EPSG","6277"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.01745329251994328,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4277"]],UNIT["metre",1,AUTHORITY["EPSG","9001"]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",49],PARAMETER["central_meridian",-2],PARAMETER["scale_factor",0.9996012717],PARAMETER["false_easting",400000],PARAMETER["false_northing",-100000],AUTHORITY["EPSG","27700"],AXIS["Easting",EAST],AXIS["Northing",NORTH]]';

const osm = new Xyz({
  url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  projection: 'EPSG:3857'
});

const world2D = new TileArcGISRest({
  url: 'https://services.arcgisonline.com/arcgis/rest/services/ESRI_Imagery_World_2D/MapServer',
  projection: 'EPSG:3857'
});

const britishNationalGrid = new ImageStatic({
  url:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/British_National_Grid.svg/2000px-British_National_Grid.svg.png',
  projection: 'EPSG:27700',
  imageExtent: [0, 0, 700000, 1300000]
});

const toppStateSource = new TileWms({
  url: 'https://ahocevar.com/geoserver/wms',
  types: [{ id: 'topp:states' }]
});

export class SampleApp extends React.Component<{}, { hideTools: boolean }> {
  constructor(props: {}) {
    super(props);
    this.state = { hideTools: false };
  }

  public setHideTools = (hideTools: boolean) => {
    this.setState({ hideTools });
  };

  public render(): React.ReactNode {
    return (
      <Romap
        uid="map"
        keyboardEventTarget={document}
        initialViewCenter={[490000, 6800000]}
        initialViewZoom={5}
        initialViewProjection="EPSG:2154"
        olMapStyle={{ position: 'absolute', width: 'calc(100% - 15px)', height: 'calc(100% - 15px)' }}
      >
        <Projection code="EPSG:2154" name="RGF93 / Lambert-93" wkt={wkt2154} />
        <Projection code="EPSG:27700" name="OSGB 1936 / British National Grid " wkt={wkt27700} />
        <Tile uid="OSM" source={osm} name="OSM" type="BASE" visible={true} />
        <Tile uid="World 2D" source={world2D} name="World 2D" type="BASE" />
        <Tile uid="Topp States" source={toppStateSource} name="Topp States" />
        <Image uid="British National Grid" source={britishNationalGrid} name="British National Grid" />
        {this.state.hideTools === false && (
          <Zone>
            <Toc uid="Toc" />
            <PanZoom uid="PanZoom" />
            <ScaleLine uid="ScaleLine" />
            <Zone style={{ position: 'absolute', top: 'calc(100% - 70px)' }}>
              <CounterButton uid="CounterButton1" />
              <CounterButton uid="CounterButton2" />
              <CounterButton uid="CounterButton3" />
              <CounterWindow uid="CounterWindow" />
              <QueryWindow uid="QueryWindow" />
            </Zone>
          </Zone>
        )}
        <Zone style={{ position: 'absolute', top: 'calc(100% - 40px)' }}>
          <HideToolsButton uid="HideToolsButton" hideTools={this.state.hideTools} setHideTools={this.setHideTools} />
        </Zone>
      </Romap>
    );
  }
}
