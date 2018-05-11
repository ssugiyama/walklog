import React from 'react';
import * as ActionTypes from './action-types';
import { createBrowserHistory, createMemoryHistory } from 'history';
import { routerReducer, LOCATION_CHANGE, routerMiddleware, replace } from 'react-router-redux';
import { matchRoutes } from 'react-router-config';
import thunkMiddleware from 'redux-thunk';
import logger from 'redux-logger';
import { createStore, applyMiddleware, combineReducers } from 'redux';
import { search, getItem, setSearchForm, setSelectedPath, setSelectedItem, setLastQuery } from './actions';
import SearchBox from './search-box';
import ItemBox from './item-box';
import { renderRoutes } from 'react-router-config';

// const injectTapEventPlugin = require('react-tap-event-plugin');
// injectTapEventPlugin();

const currentYear = (new Date()).getFullYear();
const years = [];
for (let y = currentYear; y >= 1997; y--) {
    years.push(y);
}

const initialState = {
    action_queue: [],
    search_form: {
        id: '',
        date: '',
        filter: '',
        month: '',
        year: '',
        order: 'newest_first',
        limit: '20',
        latitude: 35.690,
        longitude: 139.70,
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
    open_sidebar: true,
    open_walk_editor: false,
    open_snackbar: false,
    open_geocode_modal: false,
    street_view: null,
    info_window: {
        open: false,
        message: null,
        position: null
    },
    center: null,
    panorama: null,
    panorama_index: 0,
    panorama_count: 0,
    overlay: false,
    message: '',
    users: [],
    current_user: null,
    external_links: [],
    last_query: null,
};

const mainReducer = function(state = initialState, action) {
    switch (action.type) {
    case ActionTypes.SET_SEARCH_FORM:
        {
            if (action.payload.filter == 'hausdorff' || action.payload.filter == 'frechet') {
                action.payload.order = 'nearest_first';
            }
            else if (state.search_form.order == 'nearest_first') {
                action.payload.order = 'newest_first';
            }
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
            result.rows = action.append ? state.result.rows.concat(action.data.rows || []) : (action.data.rows || []);
            return Object.assign({}, state, {result});
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
                window.localStorage.selected_path = selected_path;
            }
            const search_form = Object.assign({}, state.search_form, {searchPath: selected_path });
            return Object.assign({}, state, {selected_path, search_form, editing_path: false});
        }
    case ActionTypes.TOGGLE_SIDEBAR:
        {
            const open_sidebar = !state.open_sidebar;
            return Object.assign({}, state, {open_sidebar});
        }
    case ActionTypes.OPEN_WALK_EDITOR:
        {
            const open_walk_editor = action.open;
            const walk_editor_mode = action.mode;
            return Object.assign({}, state, {open_walk_editor, walk_editor_mode});
        }
    case ActionTypes.OPEN_GEOCODE_MODAL:
        {
            const open_geocode_modal = action.open;
            return Object.assign({}, state, {open_geocode_modal});
        }
    case ActionTypes.ADD_PATHS:
        {
            const action_queue = state.action_queue.concat(action);
            return Object.assign({}, state, {action_queue});
        }
    case ActionTypes.DELETE_SELECTED_PATH:
        {
            const search_form = Object.assign({}, state.search_form, {searchPath: null });
            return Object.assign({}, state, {selected_path: null, search_form});
        }
    case ActionTypes.CLEAR_PATHS:
        {
            if (typeof window !== 'undefined' && window.localStorage) {
                delete window.localStorage.selected_path;
            }
            const action_queue = state.action_queue.concat(action);
            const search_form = Object.assign({}, state.search_form, {searchPath: null });
            return Object.assign({}, state, {selected_path: null, action_queue, search_form});
        }
    case ActionTypes.DOWNLOAD_PATH:
    case ActionTypes.UPLOAD_PATH:
        {
            const action_queue = state.action_queue.concat(action);
            return Object.assign({}, state, {action_queue});
        }
    case ActionTypes.SET_EDITING_PATH:
        {
            return Object.assign({}, state, {editing_path: true});
        }
    case ActionTypes.SET_STREET_VIEW:
        {
            const panorama = action.panorama;
            return Object.assign({}, state, {panorama});
        }
    case ActionTypes.SET_INFO_WINDOW:
        {
            const info_window = action.payload;
            return Object.assign({}, state, {info_window});
        }
    case ActionTypes.SET_CENTER:
        {
            const center = action.center;
            return Object.assign({}, state, {center});
        }
    case ActionTypes.REMOVE_FROM_ACTION_QUEUE:
        {
            const action_queue = state.action_queue.slice(0, -1);
            return Object.assign({}, state, {action_queue});
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
            return Object.assign({}, state, {overlay});
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
    case ActionTypes.SET_MESSAGE:
        {
            const message = action.message;
            return Object.assign({}, state, {message});
        }
    case ActionTypes.OPEN_SNACKBAR:
        {
            const open_snackbar = action.open;
            return Object.assign({}, state, {open_snackbar});
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
    default:
        return state;
    }
};

const reducers = combineReducers({
    main: mainReducer,
    routing: routerReducer
});

export function handleRoute(item_id, query, isPathSelected, prefix, rows, next) {
    if (item_id) {
        if (!query.force_fetch) {
            const index = rows.findIndex(row => row.id == item_id);
            if (index >= 0) {
                return next(setSelectedItem(rows[index], index));
            }
        }
        return next(getItem(item_id, prefix));
    }
    next(setSelectedItem(null, -1));
    const select = query['select'];
    delete query['select'];
    delete query['force_fetch'];
    const last_query = Object.assign({}, query);
    delete last_query['offset'];
    const lqs = Object.keys(last_query).map(key => key + '=' + encodeURIComponent(last_query[key])).join('&');
    next(setLastQuery(lqs));
    const search_form = Object.assign({}, initialState.search_form, query);
    if ((search_form.filter == 'crossing' || search_form.filter == 'hausdorff' || search_form.filter == 'frechet') && !isPathSelected && search_form.searchPath) {
        next(setSelectedPath(search_form.searchPath));
    }
    next(setSearchForm(search_form));
    return next(search(search_form, prefix, select, lqs));
}

let isFirstLocation = true;
const dataFetchMiddleware = store => next => {
    return action => {
        // Fetch data on update location
        if (action.type === LOCATION_CHANGE) {
            if (!isFirstLocation) {
                const branch = matchRoutes(routes, action.payload.pathname);
                const last_branch = branch[branch.length - 1];
                const match = last_branch.match;
                const state = store.getState();
                const usp = new URLSearchParams(action.payload.search);
                const query = {};
                for(let p of usp) {
                    query[p[0]] = p[1];
                }
                const qsearch = action.payload.search &&  action.payload.search.slice(1);
                if (match.params.id || qsearch != state.main.last_query) {
                    handleRoute(match.params.id, query, state.main.selected_path, '/', state.main.result.rows, next);
                }
            }
            isFirstLocation = false;
        }
        return next(action);
    };
};
export const history = typeof document !== 'undefined' ? createBrowserHistory() : createMemoryHistory();

const middlewares = [
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
    <div style={{ overflowY: 'auto' }}>
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

