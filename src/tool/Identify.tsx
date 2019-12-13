import * as React from 'react';
import { useIdentify } from './useIdentify';
import { romapContext } from '../RomapContext';
import { MapBrowserEvent } from 'ol';
import { IBaseToolProps, BaseTool } from './BaseTool';

export type FCBaseTool = React.FC<IBaseToolProps> & BaseTool<IBaseToolProps, null>;
export const Identify : FCBaseTool = () : React.ReactElement => {
    console.log("Identify");
    const [identifyPixels, setIdentifyPixels] = React.useState(null);
    const context = React.useContext(romapContext);
    React.useEffect(() => {
        const {olMap} = context;
        console.log("useEffect");        
        const onClick = (clickEvent: MapBrowserEvent) => {
            setIdentifyPixels(clickEvent.pixel);
        };
        olMap.on('click', onClick);
        return () => {
            olMap.un('click', onClick);    
        };
    });

    if (identifyPixels) {
        useIdentify(identifyPixels)
    }

    return null;
}