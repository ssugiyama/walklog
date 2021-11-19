import React from 'react';
import * as ActionTypes from './action-types';
import { connectRouter, LOCATION_CHANGE, routerMiddleware, push } from 'connected-react-router';
import { matchRoutes } from 'react-router-config';
import thunkMiddleware from 'redux-thunk';
import logger from 'redux-logger';
import { createStore, applyMiddleware, combineReducers } from 'redux';
import { search, getItem, setSearchForm, setSelectedPath, setSelectedItem,  setAdjacentItemIds, setLastQuery, toggleView } from './actions';
import SearchBox from './components/search-box';
import Box from '@mui/material/Box';
import ItemBox from './components/item-box';
import { renderRoutes } from 'react-router-config';
import { createTheme } from '@mui/material/styles';
import createCache from '@emotion/cache';
import * as colors from '@mui/material/colors';
import config from 'react-global-configuration';

// const injectTapEventPlugin = require('react-tap-event-plugin');
// injectTapEventPlugin();

const currentYear = (new Date()).getFullYear();
const years = [];
for (let y = currentYear; y >= 1997; y--) {
    years.push(y);
}

const initialState = {
    searchForm: {
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
    },
    result: {
        rows: [],
        count: 0,
        offset: 0,
        showDistance: false,
        error: null,
        searching: false,
    },
    nextId: null,
    prevId: null,
    years: years,
    selectedItem: null,
    selectedPath: null,
    selectedIndex: -1,
    pathEditable: false,
    view: 'content',
    walkEditorOpened: false,
    mapLoaded: false,
    elevationiInfoWindow: {
        open: false,
        message: null,
        position: null
    },
    center: { lat: 35.690, lng: 139.7 },
    geoMarker: {
        lat: NaN,
        lng: NaN,
        show: false,
        active: false,
    },
    zoom: 13,
    panoramaIndex: 0,
    panoramaCount: 0,
    overlay: false,
    message: null,
    users: [],
    currentUser: null,
    lastQuery: null,
};

const mainReducer = function(state = initialState, action) {
    switch (action.type) {
    case ActionTypes.SET_SEARCH_FORM:
    {
        const searchForm = Object.assign({}, state.searchForm, action.payload);
        return Object.assign({}, state, {searchForm});
    }
    case ActionTypes.SEARCH_START:
    {
        const result = { rows: [], count: 0, params: '', searching: true };
        return Object.assign({}, state, {result});
    }
    case ActionTypes.SEARCH_RESULT:
    {
        const result = {
            count: action.data.count,
            offset: action.data.offset,
            error: action.data.error,
            searching: false,
        };
        const nextId = null;
        const prevId = null;
        result.rows = action.append ? state.result.rows.concat(action.data.rows || []) : (action.data.rows || []);
        return Object.assign({}, state, {result, nextId, prevId});
    }
    case ActionTypes.SET_SELECTED_ITEM:
    {
        const selectedItem = action.item;
        const selectedIndex = action.index;
        return Object.assign({}, state, {selectedIndex, selectedItem});
    }
    case ActionTypes.SET_SELECTED_PATH:
    {
        const selectedPath = action.path;
        if (typeof window !== 'undefined' && window.localStorage) {
            if (!selectedPath) {
                delete window.localStorage.selectedPath;
            } else {
                window.localStorage.selectedPath = selectedPath;
            }
        }
        return Object.assign({}, state, {selectedPath, pathEditable: false});
    }
    case ActionTypes.TOGGLE_VIEW:
    {
        const view = (state.view == 'content' ? 'map' : 'content');
        return Object.assign({}, state, {view});
    }
    case ActionTypes.OPEN_WALK_EDITOR:
    {
        const walkEditorOpened = action.open;
        const walkEditorMode = action.mode;
        return Object.assign({}, state, {walkEditorOpened, walkEditorMode});
    }
    case ActionTypes.SET_EDITING_PATH:
    {
        const pathEditable = action.pathEditable;
        return Object.assign({}, state, {pathEditable});
    }
    case ActionTypes.SET_ELEVATION_INFO_WINDOW:
    {
        const elevationInfoWindow = action.payload;
        return Object.assign({}, state, {elevationInfoWindow});
    }
    case ActionTypes.SET_CENTER:
    {
        const center = action.center;
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.center = JSON.stringify(center);
        }
        return Object.assign({}, state, {center});
    }
    case ActionTypes.SET_GEO_MARKER:
    {
        const geoMarker = action.payload;
        const obj = { geoMarker };
        if (action.updateCenter) {
            obj.center = { lat: geoMarker.lat, lng: geoMarker.lng};
        }
        return Object.assign({}, state, obj);
    }
    case ActionTypes.SET_ZOOM:
    {
        const zoom = action.zoom;
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.zoom = zoom;
        }
        return Object.assign({}, state, {zoom});
    }
    case ActionTypes.SET_PANORAMA_COUNT:
    {
        const panoramaCount = action.count;
        return Object.assign({}, state, {panoramaCount});
    }
    case ActionTypes.SET_PANORAMA_INDEX:
    {
        let panoramaIndex = action.index;
        if (panoramaIndex < 0) panoramaIndex = 0;
        else if(panoramaIndex >=  state.panoramaCount) panoramaIndex = state.panoramaCount -1;
        return Object.assign({}, state, {panoramaIndex});
    }
    case ActionTypes.SET_OVERLAY:
    {
        const overlay = action.overlay;
        const newProps = {overlay};
        if (overlay && state.view == 'content') {
            newProps.view = 'map';
        }
        else if (!overlay && state.view == 'map') {
            newProps.view = 'content';
        }
        return Object.assign({}, state, newProps);
    }
    case ActionTypes.SET_CURRENT_USER:
    {
        const currentUser = action.user;
        return Object.assign({}, state, {currentUser});
    }
    case ActionTypes.SET_USERS:
    {
        const users = action.users;
        return Object.assign({}, state, {users});
    }
    case ActionTypes.OPEN_SNACKBAR:
    {
        const {message} = action;
        return Object.assign({}, state, {message});
    }
    case ActionTypes.SET_LAST_QUERY:
    {
        const lastQuery = action.lastQuery;
        return Object.assign({}, state, {lastQuery});
    }
    case ActionTypes.SET_ADJACENT_ITEM_IDS:
    {
        const {nextId, prevId} = action;
        return Object.assign({}, state, {nextId, prevId});
    }
    case ActionTypes.SET_MAP_LOADED:
    {
        const mapLoaded = true;
        return Object.assign({}, state, {mapLoaded});
    }
    default:
        return state;
    }
};

export function handleRoute(itemId, query, isPathSelected, prefix, rows, queryChanged, next) {
    if (itemId) {
        if (!query.forceFetch) {
            const index = rows.findIndex(row => row.id == itemId);
            if (index >= 0) {
                const nextId = index > 0 ? rows[index-1].id : null;
                const prevId = index < rows.length-1 ? rows[index+1].id : null;
                next(setAdjacentItemIds(nextId, prevId));
                return next(setSelectedItem(rows[index], index));
            }
        }
        return next(getItem(itemId, prefix));
    }
    next(setSelectedItem(null, -1));
    if (! queryChanged) return;
    const select = query['select'];
    delete query['select'];
    delete query['forceFetch'];
    const lastQuery = Object.assign({}, query);
    delete lastQuery['offset'];
    const lqs = Object.keys(lastQuery).map(key => key + '=' + encodeURIComponent(lastQuery[key])).join('&');
    next(setLastQuery(lqs));
    const numberForms = ['radius', 'latitude', 'longitude'];
    const searchForm = Object.assign({}, initialState.searchForm, query);
    for (let p of numberForms) {
        searchForm[p] = Number(searchForm[p]);
    }
    if ((searchForm.filter == 'crossing' || searchForm.filter == 'hausdorff' || searchForm.filter == 'frechet') && !isPathSelected && searchForm.searchPath) {
        next(setSelectedPath(searchForm.searchPath));
    }
    next(setSearchForm(searchForm));
    return next(search(searchForm, prefix, select, lqs));
}

const formWatchMiddleware = store => next => action => {
    let payload;
    if (action.type == ActionTypes.SET_SEARCH_FORM) {
        payload = action.payload;
    } else if (action.type == ActionTypes.SET_SELECTED_PATH) {
        payload = { searchPath: action.path };
    } else {
        return next(action);
    }
    const state = store.getState();
    const keys = ['filter', 'user', 'year', 'month', 'order', 'limit'];
    const currentFilter = payload.filter !== undefined ? payload.filter : state.main.searchForm.filter;
    switch (currentFilter) {
    case 'neighborhood':
        keys.push('radius', 'longitude', 'latitude');
        break;
    case 'cities':
        keys.push('cities');
        break;
    case 'crossing':
    case 'hausdorff':
    case 'frechet':
        keys.push('searchPath');
        break;
    }
    if (!keys.every(key => payload[key] === undefined || payload[key] === state.main.searchForm[key])) {
        const q = Object.assign({}, state.main.searchForm, payload);
        const query = {};
        keys.forEach(key => { query[key] = q[key] || ''; });
        if (payload.filter && currentFilter == 'neighborhood' && state.main.center) {
            query.latitude = state.main.center.lat;
            query.longitude = state.main.center.lng;
        }
        if (currentFilter === 'frechet' ||  currentFilter === 'hausdorff' && state.main.searchForm.order !== 'nearest_first') {
            query.order = 'nearest_first';
        } else if (currentFilter !== 'frechet' && currentFilter !== 'hausdorff' && state.main.searchForm.order === 'nearest_first') {
            query.order = 'newest_first';
        }
        if (['crossing', 'hausdorff', 'frechet'].includes(currentFilter) && action.type != ActionTypes.SET_SELECTED_PATH) {
            query.searchPath = state.main.selectedPath || '';
        }
        const usp = keys.map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`).join('&');
        store.dispatch(push({
            pathname: '/',
            search: usp,
        }));
        if (typeof window !== 'undefined') { // client side only
            if (state.main.view == 'content') {
                if ( payload.filter
                    && ( ['neighborhood', 'cities'].includes(currentFilter))
                    || ( ['hausdorff', 'crossing', 'frechet'].includes(currentFilter) && ! query.searchPath) ) {
                    next(toggleView());
                }
            }
            else {
                if ( !payload.filter && ! (currentFilter == 'cities' && ! query.cities) &&
                    ! (['crossing', 'hausdorff', 'frechet'].includes(currentFilter) && ! query.searchPath)) {
                    next(toggleView());
                }
            }
        }
    }

    return next(action);
};

let isFirstLocation = true;
const dataFetchMiddleware = store => next => {
    return action => {
        // Fetch data on update location
        if (action.type === LOCATION_CHANGE) {
            const usp = new URLSearchParams(action.payload.location.search);
            const query = {};
            for(let p of usp) {
                query[p[0]] = p[1];
            }
            if (!isFirstLocation) {
                const branch = matchRoutes(routes(), action.payload.location.pathname);
                const lastBranch = branch[branch.length - 1];
                const match = lastBranch.match;
                const state = store.getState();
                const qsearch = action.payload.location.search &&  action.payload.location.search.slice(1);
                const queryChanged = qsearch != state.main.lastQuery;
                handleRoute(match.params.id, query, state.main.selectedPath, '/', state.main.result.rows, queryChanged, next);
            }
            isFirstLocation = false;
        }
        return next(action);
    };
};

export function configureStore(state, history) {
    const reducers = combineReducers({
        main: mainReducer,
        router: connectRouter(history)
    });
    const middlewares = [
        formWatchMiddleware,
        routerMiddleware(history),
        dataFetchMiddleware,
        thunkMiddleware,
    ];

    if (process.env.NODE_ENV != 'production') {
        middlewares.push(logger);
    }

    const createStoreWithMiddleware = applyMiddleware(
        ...middlewares
    )(createStore);

    if (state) {
        return createStoreWithMiddleware(reducers, state);
    }
    else {
        return createStoreWithMiddleware(reducers);
    }
}

const SideRoot = ({ route }) => (
    <Box
        maxWidth={800}
        mx="auto"
    >
        {renderRoutes(route.routes)}
    </Box>
);

export const routes = () => [
    {
        component: SideRoot,
        routes: [
            {
                path: config.get('itemPrefix') + ':id',
                component: ItemBox,
            },
            {
                path: '/',
                component: SearchBox,
                exact: true,
            }
        ]
    }
];

export const createMuiTheme = (mode = 'light') => {
    const makeColorObject = color => colors[color] ||  {main: color};
    const themeProps = {
        palette: {
            mode,
        }
    };
    const themePrimary = config.get('themePrimary');
    const themeSecondary = config.get('themeSecondary');
    if (themePrimary) {
        themeProps.palette.primary = makeColorObject(themePrimary);
    }
    if (themeSecondary) {
        themeProps.palette.secondary = makeColorObject(themeSecondary);
    }
    return createTheme(themeProps);
};

export const createEmotionCache = () => createCache({ key: 'css' });