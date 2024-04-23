import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    view: 'content',
    overlay: false,
    walkEditorOpened: false,
    message: null,
    toolBoxOpened: false,
};

export const ViewSlice = createSlice({
    name: 'view',
    initialState,
    reducers: {
        toggleView: (state) => {
            state.view = (state.view === 'content' ? 'map' : 'content');
        },
        openWalkEditor: (state, action) => {
            const { open, mode } = action.payload;
            state.walkEditorOpened = open;
            state.walkEditorMode = mode;
        },
        setOverlay: (state, action) => {
            const overlay = action.payload;
            state.overlay = overlay;
            if (overlay && state.view === 'content') {
                state.view = 'map';
            } else if (!overlay && state.view === 'map') {
                state.view = 'content';
            }
            if (overlay) {
                state.toolBoxOpened = false;
            }
        },
        openSnackbar: (state, action) => {
            state.message = action.payload;
        },
        openToolBox: (state, action) => {
            state.g = action.payload;
        },
    },
});

export const {
    toggleView, openWalkEditor, setOverlay, openSnackbar, openToolBox,
} = ViewSlice.actions;
export default ViewSlice.reducer;
