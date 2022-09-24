import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    panoramaIndex: 0,
    panoramaCount: 0,
};

export const panoramaSlice = createSlice({
    name: 'panorama',
    initialState,
    reducers: {
        setPanoramaIndex: (state, action) => {
            const index = action.payload;
            let panoramaIndex = index;
            if (panoramaIndex < 0) panoramaIndex = 0;
            else if(panoramaIndex >=  state.panoramaCount) panoramaIndex = state.panoramaCount -1;
            state.panoramaIndex = panoramaIndex;
        },
        setPanoramaCount: (state, action) => {
            const count = action.payload;
            state.panoramaCount = count;
        },
    },
});

export const { setPanoramaIndex, setPanoramaCount } = panoramaSlice.actions;
export default panoramaSlice.reducer;