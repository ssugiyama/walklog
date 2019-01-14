import React from 'react';
import * as ActionTypes from './action-types';
import { createBrowserHistory, createMemoryHistory } from 'history';
import { connectRouter, LOCATION_CHANGE, routerMiddleware, push } from 'connected-react-router';
import { matchRoutes } from 'react-router-config';
import thunkMiddleware from 'redux-thunk';
import logger from 'redux-logger';
import { createStore, applyMiddleware, combineReducers } from 'redux';
import { search, getItem, setSearchForm, setSelectedPath, setSelectedItem,  setAdjacentItemIds, setLastQuery, toggleView } from './actions';
import SearchBox from './search-box';
import ItemBox from './item-box';
import { renderRoutes } from 'react-router-config';
import { createMuiTheme } from '@material-ui/core/styles';
import * as colors from '@material-ui/core/colors';
import config from './config';

// const injectTapEventPlugin = require('react-tap-event-plugin');
// injectTapEventPlugin();

const currentYear = (new Date()).getFullYear();
const years = [];
for (let y = currentYear; y >= 1997; y--) {
    years.push(y);
}

const initialState = {
    search_form: {
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
        show_distance: false,
        error: null,
        searching: false,
    },
    next_id: null,
    prev_id: null,
    years: years,
    selected_item: null,
    selected_path: null,
    selected_index: -1,
    highlighted_path: null,
    editing_path: false,
    view: 'content',
    open_walk_editor: false,
    map_loaded: false,
    info_window: {
        open: false,
        message: null,
        position: null
    },
    center: { lat: 35.690, lng: 139.7 },
    geo_marker: {
        lat: NaN,
        lng: NaN,
        show: false,
        active: false,
    },
    zoom: 13,
    panorama_index: 0,
    panorama_count: 0,
    overlay: false,
    message: null,
    users: [],
    current_user: null,
    external_links: [],
    last_query: null,
};

const mainReducer = function(state = initialState, action) {
    switch (action.type) {
    case ActionTypes.SET_SEARCH_FORM:
        {
            const search_form = Object.assign({}, state.search_form, action.payload);
            return Object.assign({}, state, {search_form});
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
            const next_id = null;
            const prev_id = null;
            result.rows = action.append ? state.result.rows.concat(action.data.rows || []) : (action.data.rows || []);
            return Object.assign({}, state, {result, next_id, prev_id});
        }
    case ActionTypes.SET_SELECTED_ITEM:
        {
            const selected_item = action.item;
            const selected_index = action.index;
            const highlighted_path = selected_item ? selected_item.path : null;
            return Object.assign({}, state, {selected_index, selected_item, highlighted_path});
        }
    case ActionTypes.SET_SELECTED_PATH:
        {
            const selected_path = action.path;
            if (typeof window !== 'undefined' && window.localStorage) {
                if (!selected_path) {
                    delete window.localStorage.selected_path;
                } else {
                    window.localStorage.selected_path = selected_path;
                }
            }
            return Object.assign({}, state, {selected_path, editing_path: false});
        }
    case ActionTypes.TOGGLE_VIEW:
        {
            const view = (state.view == 'content' ? 'map' : 'content');
            return Object.assign({}, state, {view});
        }
    case ActionTypes.OPEN_WALK_EDITOR:
        {
            const open_walk_editor = action.open;
            const walk_editor_mode = action.mode;
            return Object.assign({}, state, {open_walk_editor, walk_editor_mode});
        }
    case ActionTypes.SET_EDITING_PATH:
        {
            const editing_path = action.editing_path;
            return Object.assign({}, state, {editing_path});
        }
    case ActionTypes.SET_INFO_WINDOW:
        {
            const info_window = action.payload;
            return Object.assign({}, state, {info_window});
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
            const geo_marker = action.payload;
            const obj = { geo_marker };
            if (action.updateCenter) {
                obj.center = { lat: geo_marker.lat, lng: geo_marker.lng};
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
            const panorama_count = action.count;
            return Object.assign({}, state, {panorama_count});
        }
    case ActionTypes.SET_PANORAMA_INDEX:
        {
            let panorama_index = action.index;
            if (panorama_index < 0) panorama_index = 0;
            else if(panorama_index >=  state.panorama_count) panorama_index = state.panorama_count -1;
            return Object.assign({}, state, {panorama_index});
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
            const current_user = action.user;
            return Object.assign({}, state, {current_user});
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
            const last_query = action.last_query;
            return Object.assign({}, state, {last_query});
        }
    case ActionTypes.SET_ADJACENT_ITEM_IDS:
        {
            const {next_id, prev_id} = action;
            return Object.assign({}, state, {next_id, prev_id});
        }
    case ActionTypes.SET_MAP_LOADED:
        {
            const map_loaded = true;
            return Object.assign({}, state, {map_loaded});
        }
    default:
        return state;
    }
};

export const history = typeof document !== 'undefined' ? createBrowserHistory() : createMemoryHistory();

export const reducers = combineReducers({
    main: mainReducer,
    router: connectRouter(history)
});

export function handleRoute(item_id, query, isPathSelected, prefix, rows, queryChanged, next) {
    if (item_id) {
        if (!query.force_fetch) {
            const index = rows.findIndex(row => row.id == item_id);
            if (index >= 0) {
                const next_id = index > 0 ? rows[index-1].id : null;
                const prev_id = index < rows.length-1 ? rows[index+1].id : null;
                next(setAdjacentItemIds(next_id, prev_id));
                return next(setSelectedItem(rows[index], index));
            }
        }
        return next(getItem(item_id, prefix));
    }
    next(setSelectedItem(null, -1));
    if (! queryChanged) return;
    const select = query['select'];
    delete query['select'];
    delete query['force_fetch'];
    const last_query = Object.assign({}, query);
    delete last_query['offset'];
    const lqs = Object.keys(last_query).map(key => key + '=' + encodeURIComponent(last_query[key])).join('&');
    next(setLastQuery(lqs));
    const numberForms = ['radius', 'latitude', 'longitude'];
    const search_form = Object.assign({}, initialState.search_form, query);
    for (let p of numberForms) {
        search_form[p] = Number(search_form[p]);
    }
    if ((search_form.filter == 'crossing' || search_form.filter == 'hausdorff' || search_form.filter == 'frechet') && !isPathSelected && search_form.searchPath) {
        next(setSelectedPath(search_form.searchPath));
    }
    next(setSearchForm(search_form));
    return next(search(search_form, prefix, select, lqs));
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
    const current_filter = payload.filter !== undefined ? payload.filter : state.main.search_form.filter;
    switch (current_filter) {
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
    if (!keys.every(key => payload[key] === undefined || payload[key] === state.main.search_form[key])) {
        const q = Object.assign({}, state.main.search_form, payload);
        const query = {};
        keys.forEach(key => { query[key] = q[key] || ''; });
        if (payload.filter && current_filter == 'neighborhood' && state.main.center) {
            query.latitude = state.main.center.lat;
            query.longitude = state.main.center.lng;
        } else if (current_filter === 'frechet' ||  current_filter === 'hausdorff' && state.main.search_form.order !== 'nearest_first') {
            query.order = 'nearest_first';
        } else if (current_filter !== 'frechet' && current_filter !== 'hausdorff' && state.main.search_form.order === 'nearest_first') {
            query.order = 'newest_first';
        }
        if (['crossing', 'hausdorff', 'frechet'].includes(current_filter) && action.type != ActionTypes.SET_SELECTED_PATH) {
            query.searchPath = state.main.selected_path || '';
        }
        const usp = keys.map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`).join('&');
        store.dispatch(push({
            pathname: '/',
            search: usp,
        }));
        if (typeof window !== 'undefined') { // client side only
            if (state.main.view == 'content') {
                if ( payload.filter
                    && ( ['neighborhood', 'cities'].includes(current_filter))
                    || ( ['hausdorff', 'crossing', 'frechet'].includes(current_filter) && ! query.searchPath) ) {
                    next(toggleView());
                }
            }
            else {
                if ( !payload.filter && ! (current_filter == 'cities' && ! query.cities) && 
                    ! (['crossing', 'hausdorff', 'frechet'].includes(current_filter) && ! query.searchPath)) {
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
                const branch = matchRoutes(routes, action.payload.location.pathname);
                const last_branch = branch[branch.length - 1];
                const match = last_branch.match;
                const state = store.getState();
                const qsearch = action.payload.location.search &&  action.payload.location.search.slice(1);
                const queryChanged = qsearch != state.main.last_query;
                handleRoute(match.params.id, query, state.main.selected_path, '/', state.main.result.rows, queryChanged, next);
            }
            isFirstLocation = false;
            if (window && window.localStorage) {
                if ( query.restore_url) {
                    location.href = (localStorage.last_url || '/');
                    return;
                }
                localStorage.last_url = action.payload.location.pathname + action.payload.location.search;
            }
        }
        return next(action);
    };
};

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

export function configureStore(state) {
    if (state) {
        return createStoreWithMiddleware(reducers, state);
    }
    else {
        return createStoreWithMiddleware(reducers);
    }
}

const SideRoot = ({ route }) => (
    <div style={{
        padding: '8px 16px',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        maxWidth: 800,
        marginLeft: 'auto',
        marginRight: 'auto',
    }}>
        {renderRoutes(route.routes)}
    </div>
);

export const routes = [
    {
        component: SideRoot,
        routes: [
            {
                path: '/:id',
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

export const theme = createMuiTheme({
    palette: {
        primary: colors[config.theme_primary || 'indigo'],
        secondary: colors[config.theme_secondary || 'pink'],
        type: config.theme_type || 'light',
    },
    typography: {
        useNextVariants: true,
    }
});
