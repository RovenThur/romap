import OlGeoJSON from 'ol/format/GeoJSON';
import { send, IResponse } from 'bhreq';
import { ExternalVector } from './ExternalVector';

export class Wfs extends ExternalVector {
  private typename: string;

  private geoJSONFormat = new OlGeoJSON();

  constructor(options?: any) {
    super(options);
    this.typename = options.typename;
  }

  public load(extent: [number, number, number, number], projectionCode: string) {
    const url = `${this.getUrl()}?service=WFS&version=1.1.0&request=GetFeature&typename=${
      this.typename
    }&outputFormat=application/json&srsname=${projectionCode}&bbox=${extent.join(',')},${projectionCode}`;
    return send({ url, contentType: 'application/json' }).then(
      (response: IResponse) => this.geoJSONFormat.readFeatures(response.body),
      () => {
        console.error(`Request error ${url}`);
      }
    );
  }
}
