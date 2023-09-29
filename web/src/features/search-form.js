import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    id: '',
    date: '',
    filter: '',
    month: '',
    year: '',
    order: 'newest_first',
    limit: '20',
    latitude: NaN,
    longitude: NaN,
    radius: 500,
    cities: '',
    user: '',
    draft: false,
};

export const searchFormSlice = createSlice({
    name: 'searchForm',
    initialState,
    reducers: {
        setSearchForm: (state, action) => {
            Object.assign(state, action.payload);
        },
    }
});

export const defaultFormValues = initialState;
export const { setSearchForm } = searchFormSlice.actions;
export default searchFormSlice.reducer;
