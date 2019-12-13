import * as React from 'react';
import { IBaseToolProps, BaseTool } from './BaseTool';
import { Overlay, Feature } from 'ol';
import { romapContext, IRomapContext } from '../RomapContext';

export interface IPopupProps {
    features: { [key: string]: Feature[] }
}

export function Popup(props: IPopupProps) {    
    const context = React.useContext(romapContext);
    const popup: React.RefObject<HTMLDivElement> = React.createRef();
    let overlay: Overlay = null;

    React.useEffect(() => {
        console.log("Use Efect");
        overlay = new Overlay({
            autoPan: true,
            element: this.popup.current
        });
    
        context.olMap.addOverlay(overlay);

        return () => {
            context.olMap.removeOverlay(overlay);
            overlay = null;
        };
    });

    const closeOverlay = () => {
        overlay.setPosition(undefined);
    };

    const renderTab = (tabName: string, items: Feature[]) => {
        const htmlItems = items.map((item: Feature, index) => {
            const itemprops = item.getProperties();

            const htmlItemProps = Object.keys(itemprops)
                .filter((prop) => typeof itemprops[prop] !== 'object')
                .map((prop: any, propIndex) => {
                    return (<div className={`popup-table-row ${propIndex%2 ? 'odd': 'even'}`} key={`${prop}-${propIndex}-${index}`}>
                            <div className="popup-label-cell">{prop}:</div>
                            <div className="popup-value-cell"> {itemprops[prop]}</div>
                        </div>);
                });
            return (<div className="popup-table-item-wrapper" key={index + tabName}>
                {htmlItemProps}
            </div>);
        });

        // On suprime le dernier break

        return (<div key={tabName} className="popup-section">
            <div className="popup-tab">
                <p>{tabName}</p>
            </div>
            <div className="popup-tab-content">
                {htmlItems}
            </div>
        </div>);
    }

    const renderPopupContent = () => {
        const { features } = props;
        const content = Object.keys(features)
            .filter((key) => features[key].length > 0)
            .map((key) => {
                return renderTab(key, features[key])
            });
        return (
            <div className="popup-content">
                <div className="popup-table-wrapper">
                    {content}
                </div>
            </div>
        );
    }

    return (
        <div id="popup" className="popup-container" ref={popup}>
            <div className="popup-header">
                <div className="popup-title">Identify Results</div>
                <div className="close-popup" onClick={closeOverlay}>
                    x
                    </div>
            </div>
            {renderPopupContent()}
        </div>
    )
}