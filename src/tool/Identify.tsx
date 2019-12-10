import * as React from 'react';
import { BaseTool, IBaseToolProps } from './BaseTool';
import { romapContext, IRomapContext } from '../RomapContext';
import { MapBrowserEvent, Feature, Overlay } from 'ol';
import { constructQueryRequestFromPixel, IQueryResponse, IExtended, IQueryFeatureTypeResponse } from '../source';
import OlBaseLayer from 'ol/layer/Base';

export interface IIdentifyState {
    features: { [key: string]: Feature[] }
}

let overlay: Overlay = null;
export class Identify extends BaseTool<IBaseToolProps, IIdentifyState> {

    public static contextType: React.Context<IRomapContext> = romapContext;
    public context: IRomapContext;
    public popup: React.RefObject<HTMLDivElement>;
    constructor(props: IBaseToolProps) {
        super(props);
        this.state = { features: {} };
        this.popup = React.createRef();
    }

    public toolDidConstruct() {
        const { olMap } = this.context;
        if (overlay === null) {
            this.buildclickInteractionAndLayer();
            olMap.on('click', this.handleClick.bind(this));
        }
    }

    public toolDidDestroy() {
        const { olMap } = this.context;
        olMap.un('click', this.handleClick);
        this.context.olMap.removeOverlay(overlay);
        overlay = null;
    }

    public buildclickInteractionAndLayer() {

        overlay = new Overlay({
            autoPan: true,
            element: this.popup.current
        });

        this.context.olMap.addOverlay(overlay);
    }
    public handleClick = (clickEvent: MapBrowserEvent) => {
        const { olMap } = this.context;

        const promises: Array<Promise<IQueryResponse>> = [];
        const queryRequest = constructQueryRequestFromPixel(clickEvent.pixel, 2, olMap);
        queryRequest.limit = 10;
        olMap.forEachLayerAtPixel(clickEvent.pixel, (layer: OlBaseLayer) => {
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
            this.setState({ features });
            overlay.setPosition(clickEvent.coordinate);
        });
    }

    public renderTab(tabName: string, items: Feature[]) {
        const htmlItems = items.map((item: Feature, index) => {
            const itemprops = item.getProperties();

            const htmlItemProps = Object.keys(itemprops)
                .filter((prop) => typeof itemprops[prop] !== 'object')
                .map((prop: any, propIndex) => {
                    return (<tr className="popup-table-row" key={`${prop}-${propIndex}-${index}`}>
                            <td className="popup-label-cell">{prop}:</td>
                            <td className="popup-value-cell">{itemprops[prop]}</td>
                        </tr>);
                });
            if (htmlItemProps.length > 0) {
                htmlItemProps.push(<tr className="popup-table-row" key={`${tabName}-break`}><td className="break">BREAK</td></tr>);
            }
            return htmlItemProps;
        });
        // On suprime le dernier break
        if (htmlItems.length > 1) {
            console.log(htmlItems[htmlItems.length - 1].pop());
        }

        return (<table key={tabName} className="popup-section">
            <thead className="popup-tab">
                <tr><td>{tabName}</td></tr>
            </thead>
            <tbody className="popup-tab-content">
                {htmlItems}
            </tbody>
        </table>);
    }

    public renderPopupContent() {
        const { features } = this.state;
        const content = Object.keys(features)
            .filter((key) => features[key].length > 0)
            .map((key) => {
                return this.renderTab(key, features[key])
            });
        return (
            <div className="popup-content">
                <div className="popup-table-wrapper">
                    {content}
                </div>
            </div>
        );
    }

    public render() {
        const closeOverlay = () => {
            overlay.setPosition(undefined);
        };
        return (
            <div id="popup" className="popup" ref={this.popup}>
                <div className="popup-header">
                    <h2>Identify Results</h2>
                    <a href="#" className="close-popup" onClick={closeOverlay}>X</a>
                </div>
                {this.renderPopupContent()}
            </div>
        )
    }

}