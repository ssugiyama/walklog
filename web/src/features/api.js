import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { replace } from '@lagunovsky/redux-react-router';
import { getTitle } from '../app';
const initialState = {
    result: {
        rows: [],
        count: 0,
        offset: 0,
        showDistance: false,
        error: null,
        searching: false,
    },
    selectedItem: null,
    selectedIndex: -1,
    nextId: null,
    prevId: null,
    lastQuery: null,
};

const search = createAsyncThunk(
    'api/search',
    async (args, thunkApi) => {
        const { func, props } = args;
        const offset = Number(props['offset']);
        const keys = ['user', 'date', 'filter', 'year', 'month', 'radius', 'longitude', 'latitude', 'cities', 'searchPath', 'limit', 'order', 'offset'];
        const params = keys.filter(key => props[key]).map(key => `${key}=${encodeURIComponent(props[key])}`).join('&');
        let data;
        if (func) {
            data = await func(props);
        }
        else {
            const response =  await fetch('/api/search?' + params);
            data = await response.json();
        }
        if (offset > 0) {
            data.append = true;
            const state = thunkApi.getState();
            thunkApi.dispatch(replace({pathname: '/', search: state.api.lastQuery}));
        }
        return data;
    }
);

const getItem = createAsyncThunk(
    'api/getItem',
    async (args) => {
        const { id, func } = args;
        let data;
        if (func) {
            data = await func({id});
        } else {
            const response = await fetch('/api/get/' + id);
            data = await response.json();
        }
        return data;
    }
);

const _setSearchResult = (state, action) => {
    const data = action.payload || {};
    const error = action.error;
    const result = {
        count: data ? data.count : 0,
        offset: data ? data.offset : 0,
        error,
        searching: false,
    };
    state.nextId = null;
    state.prevId = null;
    result.rows = data.append ? state.result.rows.concat(data.rows || []) : (data.rows || []);
    state.result = result;
};

export const apiSlice = createSlice({
    name: 'api',
    initialState,
    reducers: {
        setSelectedItem: (state, action) => {
            const { item, index } = action.payload;
            state.selectedItem = item;
            state.selectedIndex = index;
            if (typeof(document) !== 'undefined') {
                document.title = getTitle(item);
            }
        },
        setSearchResult: (state, action) => _setSearchResult(state, action),
        setAdjacentItemIds: (state, action) => {
            const { nextId, prevId } = action.payload;
            state.nextId = nextId;
            state.prevId = prevId;
        },
        setLastQuery: (state, action) => {
            state.lastQuery = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(search.pending, (state) => {
            state.result.searching =  true;
        });
        builder.addCase(search.fulfilled, (state, action) => { _setSearchResult(state, action); });
        builder.addCase(search.rejected, (state, action) => { _setSearchResult(state, action); });
        builder.addCase(getItem.fulfilled, (state, action) => {
            const data = action.payload;
            state.nextId = data.nextId;
            state.prevId = data.prevId;
            if (data.rows.length > 0) {
                state.selectedItem = data.rows[0];
                state.selectedIndex = 0;
            }
        });
    },
});

export { search, getItem };
export const { setSearchResult, setAdjacentItemIds, setLastQuery, setSelectedItem } = apiSlice.actions;
export default apiSlice.reducer;