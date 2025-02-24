import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { replace } from '@lagunovsky/redux-react-router';
import { getTitles, idToUrl } from '../utils/meta-utils';
import fetchWithAuth from '../fetch-with-auth';

const initialState = {
    result: {
        rows: [],
        count: 0,
        offset: 0,
        showDistance: false,
        error: null,
        searching: false,
        isDraft: false,
    },
    selectedItem: null,
    selectedIndex: -1,
    nextId: null,
    prevId: null,
    lastQuery: null,
    needsReload: false,
};

const search = createAsyncThunk(
    'api/search',
    async (args, thunkApi) => {
        const { func, props } = args;
        const selectFirst = props.select_first;
        const offset = Number(props.offset);
        const keys = ['user', 'date', 'filter', 'year', 'month', 'radius', 'longitude', 'latitude', 'cities', 'searchPath', 'limit', 'order', 'offset'];
        const params = keys.filter((key) => props[key]).map((key) => `${key}=${encodeURIComponent(props[key])}`).join('&');
        let data;
        if (func) {
            data = await func(props);
        } else {
            const fetchFunc = fetchWithAuth;
            const response = await fetchFunc(`/api/search?${params}`);
            data = await response.json();
        }
        if (selectFirst) {
            data.append = true;
            const { draft } = data.rows[0];
            thunkApi.dispatch(replace(idToUrl(data.rows[0].id, draft && { draft })));
        } else if (offset > 0) {
            data.append = true;
            const state = thunkApi.getState();
            thunkApi.dispatch(replace({ pathname: '/', search: state.api.lastQuery }));
        }
        return data;
    },
);

const getItem = createAsyncThunk(
    'api/getItem',
    async (args) => {
        const { id, draft, func } = args;
        let data;
        if (func) {
            data = await func({ id });
        } else {
            const fetchFunc = draft ? fetchWithAuth : fetch;
            const path = `/api/get/${id}${draft ? '?draft=true' : ''}`;
            const response = await fetchFunc(path);
            data = await response.json();
        }
        return data;
    },
);

const setSearchResultProc = (state, action) => {
    const data = action.payload || {};
    const { error } = action;
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
    state.needsReload = false;
};

export const apiSlice = createSlice({
    name: 'api',
    initialState,
    reducers: {
        setSelectedItem: (state, action) => {
            const { item, index } = action.payload;
            state.selectedItem = item;
            state.selectedIndex = index;
            if (item) state.isDraft = item.draft;
            if (typeof document !== 'undefined') {
                document.title = getTitles(item).join(' - ');
            }
        },
        setSearchResult: (state, action) => setSearchResultProc(state, action),
        setAdjacentItemIds: (state, action) => {
            const { nextId, prevId } = action.payload;
            state.nextId = nextId;
            state.prevId = prevId;
        },
        setLastQuery: (state, action) => {
            const lqs = Object.keys(action.payload).map((key) => `${key}=${encodeURIComponent(action.payload[key])}`).join('&');
            state.lastQuery = lqs;
            state.isDraft = action.payload.draft === 'true';
        },
    },
    extraReducers: (builder) => {
        builder.addCase(search.pending, (state) => {
            state.result.searching = true;
        });
        builder.addCase(search.fulfilled, (state, action) => setSearchResultProc(state, action));
        builder.addCase(search.rejected, (state, action) => setSearchResultProc(state, action));
        builder.addCase(getItem.fulfilled, (state, action) => {
            const data = action.payload;
            state.nextId = data.nextId;
            state.prevId = data.prevId;
            const { error } = action;
            if (data.rows.length > 0) {
                Object.assign(state, {
                    selectedItem: data.rows[0],
                    isDraft: data.rows[0].draft,
                    selectedIndex: 0,
                });
            }
            state.result = {
                count: data.rows.count,
                offset: 0,
                error,
                searching: false,
                rows: data.rows,
            };
            state.lastQuery = state.isDraft ? 'draft=true' : null;
            state.needsReload = true;
        });
    },
});

export { search, getItem };
export const {
    setSearchResult, setAdjacentItemIds, setLastQuery, setSelectedItem,
} = apiSlice.actions;
export default apiSlice.reducer;
