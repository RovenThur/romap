import OlVector from 'ol/source/Vector';
import OlFeature from 'ol/Feature';
import OlProjection from 'ol/proj/Projection';
import { fromCircle } from 'ol/geom/Polygon';
import Circle from 'ol/geom/Circle';
import OlGeoJSON from 'ol/format/GeoJSON';
import booleanDisjoint from '@turf/boolean-disjoint';
import { Feature } from '@turf/helpers';
import { IQueryRequest, IQueryResponse } from './IExtended';
import { IVector } from './IVector';

export abstract class Vector extends OlVector implements IVector {
  protected options: any;

  protected oldProjectionCode: string;

  protected actualProjectionCode: string;

  private queryGeoJSONFormat = new OlGeoJSON();

  constructor(options: any = {}) {
    super(options);
    this.options = options;
  }

  public getSourceTypeName(): string {
    return 'Vector';
  }

  public getSourceOptions(): any {
    return this.options;
  }

  public isSnapshotable(): boolean {
    return this.options.snapshotable == null ? true : this.options.snapshotable; // true by default
  }

  public isListable(): boolean {
    return this.options.listable == null ? true : this.options.listable; // true by default
  }

  public loadFeatures(extent: [number, number, number, number], resolution: number, projection: OlProjection) {
    if (projection != null && this.oldProjectionCode !== projection.getCode()) {
      this.oldProjectionCode = this.actualProjectionCode;
      this.actualProjectionCode = projection.getCode();
    }
    super.loadFeatures(extent, resolution, projection);
  }

  public query(request: IQueryRequest): Promise<IQueryResponse> {
    const { mapProjection, geometry, geometryProjection, limit } = request;
    const features = [] as OlFeature[];
    let destGeometry = null;
    if (geometry != null) {
      if (mapProjection != null && geometryProjection != null) {
        destGeometry = geometry.transform(geometryProjection, mapProjection);
      } else {
        destGeometry = geometry;
      }
      if (destGeometry.getType() === 'Circle') {
        destGeometry = fromCircle(geometry as Circle);
      }
      const extent = destGeometry.getExtent();
      const jsonGeom = this.queryGeoJSONFormat.writeGeometryObject(destGeometry) as Feature;
      this.forEachFeatureIntersectingExtent(extent, (feature: OlFeature) => {
        if (features.length < limit) {
          const jsonResGeom = this.queryGeoJSONFormat.writeGeometryObject(feature.getGeometry()) as Feature;
          if (!booleanDisjoint(jsonResGeom, jsonGeom)) {
            features.push(feature);
          }
        }
      });
    } else {
      this.forEachFeature((feature: OlFeature) => {
        if (features.length < limit) {
          features.push(feature);
        }
      });
    }
    return Promise.resolve({
      request,
      featureTypeResponses: [
        {
          features
        }
      ]
    });
  }
}
