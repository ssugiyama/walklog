'use client'
import { useReducer, useContext } from "react";
import { createContext } from 'react';


const initialMainState = {
    mode: 'content',
    overlay: false,
    message: null,
    toolBoxOpened: false,
    panoramaIndex: 0,
    panoramaCount: 0,
    autoGeoLocation: false,
};

const mainReducer = (state, action) => {
    switch (action.type) {
        case 'TOGGLE_VIEW':
            return { ...state, mode: state.mode === 'map' ? 'content' : 'map' };
        case 'OPEN_TOOL_BOX':
            return { ...state, toolBoxOpened: true };
        case 'CLOSE_TOOL_BOX':
            return { ...state, toolBoxOpened: false };
        case 'OPEN_SNACKBAR':
            return { ...state, message: action.payload };
        case 'CLOSE_SNACKBAR':
            return { ...state, message: null };
        case 'SET_OVERLAY':
            return { ...state, overlay: action.payload };
        case 'SET_PANORAMA_INDEX':
            return { ...state, panoramaIndex: action.payload };
        case 'SET_PANORAMA_COUNT':
            return { ...state, panoramaCount: action.payload };
        case 'SET_AUTO_GEO_LOCATION':
            return { ...state, autoGeoLocation: action.payload };
        default:
            return state;
    }
}

const MainContext = createContext({});

export function MainContextProvider({ children }: { children: React.ReactNode }) {
    const [mainState, dispatchMain] = useReducer(mainReducer, initialMainState)
    return (
        <MainContext.Provider value={{ mainState, dispatchMain }}>
            {children}
        </MainContext.Provider>
    )
}

export function useMainContext() {
    return useContext(MainContext)
}

export default MainContext;
