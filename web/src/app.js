import React from 'react';
import * as ActionTypes from './action-types';
import { Route, browserHistory, match } from 'react-router';
import { routerReducer, LOCATION_CHANGE, routerMiddleware } from 'react-router-redux';
import thunkMiddleware from 'redux-thunk';
import logger from 'redux-logger';
import { createStore, applyMiddleware, combineReducers } from 'redux';
import { search, setSearchForm, setSelectedPath, setSelectedItem } from './actions';
import BodyContainer from './body';

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
        filter: 'any',
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
        params: '',
        show_distance: false,
        error: null,
        searching: false,
        next_id: null,
        prev_id: null,
    },
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
    tab_value: 'search',
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
    case ActionTypes.RESET_SEARCH_FORM:
        {
            const search_form = Object.assign({}, initialState.search_form);
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
                params: action.data.params,
                error: action.data.error,
                searching: false,
                next_id: action.data.next_id,
                prev_id: action.data.prev_id,
            };
            result.rows = action.append ? state.result.rows.concat(action.data.rows || []) : (action.data.rows || []);
            return Object.assign({}, state, {result});
        }
    case ActionTypes.SET_SELECTED_ITEM:
        {
            const selected_item = action.item;
            const selected_index = action.index;
            const highlighted_path = selected_item ? selected_item.path : state.selected_path;
            let tab_value;
            if (!selected_item) {
                tab_value = 'search';
            }
            else {
                tab_value = 'comment';
            }
            return Object.assign({}, state, {selected_index, selected_item, tab_value, highlighted_path});
        }
    case ActionTypes.SET_SELECTED_PATH:
        {
            const selected_path = action.path;
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.selected_path = selected_path;
            }
            let tab_value = state.tab_value;
            if (!selected_path && tab_value == 'visualization') {
                tab_value = 'search';
            }
            const search_form = Object.assign({}, state.search_form, {searchPath: selected_path });
            return Object.assign({}, state, {selected_path, search_form, tab_value, editing_path: false});
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
    case ActionTypes.SET_TAB_VALUE:
        {
            const tab_value = action.value;
            return Object.assign({}, state, {tab_value});
        }
    case ActionTypes.ADD_PATHS:
        {
            const action_queue = state.action_queue.concat(action);
            return Object.assign({}, state, {action_queue});
        }
    case ActionTypes.DELETE_SELECTED_PATH:
        {
            let tab_value = state.tab_value;
            if (typeof window !== 'undefined' && window.localStorage) {
                delete window.localStorage.selected_path;
            }
            if (tab_value == 'visualization') {
                tab_value = 'search';
            }
            const search_form = Object.assign({}, state.search_form, {searchPath: null });
            return Object.assign({}, state, {selected_path: null, tab_value, search_form});
        }
    case ActionTypes.CLEAR_PATHS:
        {
            let tab_value = state.tab_value;
            if (typeof window !== 'undefined' && window.localStorage) {
                delete window.localStorage.selected_path;
            }
            const action_queue = state.action_queue.concat(action);
            if (tab_value == 'visualization') {
                tab_value = 'search';
            }
            const search_form = Object.assign({}, state.search_form, {searchPath: null });
            return Object.assign({}, state, {selected_path: null, action_queue, tab_valu, search_form});
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
    default:
        return state;
    }
};

const reducers = combineReducers({
    main: mainReducer,
    routing: routerReducer
});

export function handleRoute(renderProps, isPathSelected, prefix, rows, next) {
    const query = Object.assign({}, renderProps.location.query);
    if (renderProps.params.id) {
        if (!query.force_fetch) {
            const index = rows.findIndex(row => row.id == renderProps.params.id);
            if (index >= 0) {
                return next(setSelectedItem(rows[index], index));
            }
        }
        query.id = renderProps.params.id;
    }
    const show_on_map = query.show || (query.id && 'first');
    delete query['show'];
    const search_form = Object.assign({}, initialState.search_form, query);
    if ((search_form.filter == 'crossing' || search_form.filter == 'hausdorff' || search_form.filter == 'frechet') && !isPathSelected && search_form.searchPath) {
        next(setSelectedPath(search_form.searchPath));
    }
    next(setSearchForm(search_form));
    return next(search(search_form, show_on_map, prefix));
}

let isFirstLocation = true;
const dataFetchMiddleware = store => next => {
    return action => {
        // Fetch data on update location
        if (action.type === LOCATION_CHANGE) {
            if (!isFirstLocation) {
                match({ routes, location: action.payload.pathname + action.payload.search }, (err, redirect, renderProps) => {
                    if (err || redirect || !renderProps) return;
                    const state = store.getState();
                    handleRoute(renderProps, state.main.selected_path, '/', state.main.result.rows, next);
                });
            }
            isFirstLocation = false;
        }
        return next(action);
    };
};

const middlewares = [
    routerMiddleware(browserHistory),
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

export const routes = <Route path="/" component={BodyContainer}>
    <Route path="/:id" />
</Route>
;
