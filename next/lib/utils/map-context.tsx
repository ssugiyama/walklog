'use client'
import { useState, useContext } from "react";
import { createContext } from 'react';
import { Path } from "typescript";

type MapContextType = {
    map: google.maps.Map | null;
    pathManager: any;
    addPoint: (lat: number, lng: number, append: boolean) => void;
    uploadPath: () => void;
    downloadPath: () => void,
    clearPaths: (retainTemporaryAndSelection: boolean) => void;
    addPaths: (items: Path[]) => void;
    deleteSelectedPath: () => void;
}

const initialState: MapContextType = {
    map: null as google.maps.Map,
    pathManager: null as any,
    addPoint: () => {},
    uploadPath: () => {},
    downloadPath: () => {},
    clearPaths: () => {},
    addPaths: () => {},
    deleteSelectedPath: () => {},
}

const MapContext = createContext({});

export function MapContextProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState(initialState)
    return (
        <MapContext.Provider value={{ state, setState }}>
            {children}
        </MapContext.Provider>
    )
}

export function useMapContext() {
    return useContext(MapContext)
}

export default MapContext;
