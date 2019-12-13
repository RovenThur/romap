import * as React from 'react';
import { BaseTool, IBaseToolProps } from './BaseTool';
import { romapContext, IRomapContext } from '../RomapContext';
import { MapBrowserEvent, Feature, Overlay } from 'ol';
import { constructQueryRequestFromPixel, IQueryResponse, IExtended, IQueryFeatureTypeResponse } from '../source';
import OlBaseLayer from 'ol/layer/Base';
import { Pixel } from 'ol/pixel';

export interface IIdentifyResponse {
    features: { [key: string]: Feature[] }
}

export function useIdentify(pixel: Pixel) {
    console.log("Identify", pixel);
    const context = React.useContext(romapContext);
    
    const [results, setResults] = React.useState({});
    const { olMap } = context;

    console.log(context);
    if (olMap) {
        const promises: Array<Promise<IQueryResponse>> = [];
        const queryRequest = constructQueryRequestFromPixel(pixel, 2, olMap);
        queryRequest.limit = 10;
        olMap.forEachLayerAtPixel(pixel, (layer: OlBaseLayer) => {
            if (layer.getVisible() && 'getSource' in layer) {
                const source = (layer as any).getSource();
                if (source && 'query' in source) {
                    promises.push((source as IExtended).query(queryRequest));
                }
            }
        });
        Promise.all(promises).then((queryResponses: IQueryResponse[]) => {
            const features: any = {};
            queryResponses.forEach((queryResponse: IQueryResponse) => {
                const ftResps = queryResponse.featureTypeResponses;
                ftResps.forEach((ftResp: IQueryFeatureTypeResponse) => {
                    const type = ftResp.type ? ftResp.type.id : 'unknown';
                    if (!features[type]) {
                        features[type] = [];
                    }
                    features[type].push(...ftResp.features);
                });
            });
            console.log("Identify", features);
            setResults({ features });
        });
    }
    
    return results ;
}