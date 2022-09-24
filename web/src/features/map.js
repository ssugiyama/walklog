import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    mapLoaded: false,
    selectedPath: null,
    pathEditable: false,
    center: { lat: 35.690, lng: 139.7 },
    geoMarker: {
        lat: NaN,
        lng: NaN,
        show: false,
        active: false,
    },
    zoom: 13,
    elevationiInfoWindow: {
        open: false,
        message: null,
        position: null
    },
};

export const mapSlice = createSlice({
    name: 'map',
    initialState,
    reducers: {
        setMapLoaded: (state) => {
            state.mapLoaded = true;
        },
        setSelectedPath: (state, action) => {
            const path = action.payload;
            state.selectedPath = path;
            state.pathEditable = false;
            if (typeof window !== 'undefined' && window.localStorage) {
                if (!path) {
                    delete window.localStorage.selectedPath;
                } else {
                    window.localStorage.selectedPath = path;
                }
            }
        },
        setCenter: (state, action) => {
            const center = action.payload;
            state.center = center;
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.center = JSON.stringify(center);
            }
        },
        setPathEditable: (state, action) => {
            state.pathEditable = action.payload;
        },
        setGeoMarker: (state, action) => {
            const { lat, lng, show, updateCenter } = action.payload;
            if (updateCenter) {
                state.center = { lat, lng };
            }
            state.geoMarker = { lat, lng, show };
        },
        setZoom: (state, action) => {
            const zoom = action.payload;
            state.zoom = zoom;
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.zoom = zoom;
            }
        },
        setElevationInfoWindow: (state, action) => {
            state.elevationInfoWindow = action.payload;
        },
    },
});

export const { setMapLoaded, setSelectedPath, setCenter, setZoom, setPathEditable, setGeoMarker, setElevationInfoWindow } = mapSlice.actions;
export default mapSlice.reducer;