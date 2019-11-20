import OlTileArcGISRest from 'ol/source/TileArcGISRest';
import OlFeature from 'ol/Feature';
import { IQueryRequest, IQueryResponse, IFeatureType } from './IExtended';
import { ITileImage } from './ITileImage';

export class TileArcGISRest extends OlTileArcGISRest implements ITileImage {
  protected options: any;

  constructor(options: any = {}) {
    super(options);
    this.options = options;
  }

  public getSourceTypeName(): string {
    return 'TileArcGISRest';
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

  public query(request: IQueryRequest): Promise<IQueryResponse> {
    const features = [] as OlFeature[];
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
