import * as ActionTypes from './action-types'
import React  from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, IndexRoute, browserHistory, match } from 'react-router'
import { syncHistoryWithStore, routerReducer, LOCATION_CHANGE, routerMiddleware } from 'react-router-redux'
import thunkMiddleware from 'redux-thunk';
import createLogger from 'redux-logger';
import { createStore, applyMiddleware, combineReducers } from 'redux';
import { search, setSearchForm, setSelectedPath } from './actions';
import BodyContainer from './body';

const injectTapEventPlugin = require("react-tap-event-plugin");
injectTapEventPlugin();

let currentYear = (new Date()).getFullYear();
let years = [];
for (let y = currentYear; y >= 1997; y--) {
    years.push(y);
}

const initialState = {
    search_form: {
		id: '',
		date: '',
		filter: "any",
		month: "",
		year: "",
		order: "newest_first",
		limit: "20",
		latitude: 35.690,
		longitude: 139.70,
		radius: 500,
		cities: '',
    },
    result: {
		rows: [],
		count: 0,
		params: '',
		show_distance: false,
    },
    years: years,
    selected_item: null,
    selected_path: null,
    selected_index: -1,
    editing_path: false,
    open_sidebar: true,
    open_walk_editor: false,
    open_io_modal: false,
    open_geocode_modal: false,
    tab_value: 'search',
    street_view: null,
    paths: {},
    info_window: {
		open: false,
		message: null,
		position: null
    },
    center: null,
    panorama: null,
}

const mainReducer = function(state = initialState, action) {
    let result;

    switch (action.type) {
	case ActionTypes.SET_SEARCH_FORM:
	{
		if (action.payload.filter == 'hausdorff') {
		    action.payload.order = 'nearest_first';
		}
		else if (state.search_form.order == 'nearest_first') {
		    action.payload.order = 'newest_first';
		}
		let search_form = Object.assign({}, state.search_form, action.payload);
		return Object.assign({}, state, {search_form});
	}
	case ActionTypes.SEARCH_START:
	{
		let result = { rows: [], count: 0, params: '' };
		return Object.assign({}, state, {result});
	}
	case ActionTypes.SEARCH_RESULT:
	{
		let result;
		if (action.append) {
		    result = { rows: state.result.rows.concat(action.data.rows), count: state.result.count, params: action.data.params };
		}
		else {
		    result = { rows: action.data.rows, count: action.data.count, params: action.data.params };
		}
		return Object.assign({}, state, {result});
	}
    case ActionTypes.SET_SELECTED_ITEM:
	{
		let selected_item = action.item;
		let selected_index = action.index;
		let selected_path = selected_item ? selected_item.path : state.selected_path;
		let paths = Object.assign({}, state.paths);
		paths[selected_path] = true;
		let tab_value;
		if (!selected_item) {
		    tab_value = 'search';
		}
		else {
		    tab_value = 'comment';
		}
		let search_form = Object.assign({}, state.search_form, {searchPath: selected_path });
		return Object.assign({}, state, {search_form, selected_index, selected_item, tab_value, selected_path, paths});
	}
    case ActionTypes.SET_SELECTED_PATH:
	{
		let selected_path = action.path;
		let tab_value = state.tab_value;
		let paths = Object.assign({}, state.paths);
		if (selected_path) paths[selected_path] = true;
		if (!selected_path && tab_value == 'visualization') {
		    tab_value = 'search';
		}
		let search_form = Object.assign({}, state.search_form, {searchPath: selected_path });
		return Object.assign({}, state, {selected_path, search_form, tab_value, editing_path: false, paths});
	}
	case ActionTypes.TOGGLE_SIDEBAR:
	{
		let open_sidebar = !state.open_sidebar;
		return Object.assign({}, state, {open_sidebar});
	}
	case ActionTypes.OPEN_WALK_EDITOR:
	{
		let open_walk_editor = action.open;
		let walk_editor_mode = action.mode;
		return Object.assign({}, state, {open_walk_editor, walk_editor_mode});
	}
	case ActionTypes.OPEN_IO_MODAL:
	{
		let open_io_modal = action.open;
		return Object.assign({}, state, {open_io_modal});
	}
	case ActionTypes.OPEN_GEOCODE_MODAL:
	{
		let open_geocode_modal = action.open;
		return Object.assign({}, state, {open_geocode_modal});
	}
	case ActionTypes.SET_TAB_VALUE:
	{
		let tab_value = action.value;
		return Object.assign({}, state, {tab_value});
	}
	case ActionTypes.ADD_PATHS:
	{
		let paths = Object.assign({}, state.paths);
		for (let path of action.paths) {
		    paths[path] = true;
		}
		return Object.assign({}, state, {paths});
	}
	case ActionTypes.DELETE_SELECTED_PATH:
	{
		let tab_value = state.tab_value;
		let paths = Object.assign({}, state.paths);
		delete paths[state.selected_path];
		if (tab_value == 'visualization') {
		    tab_value = 'search';
		}
		return Object.assign({}, state, {selected_path: null, paths, tab_value});
	}
	case ActionTypes.CLEAR_PATHS:
	{
		let tab_value = state.tab_value;
		if (tab_value == 'visualization') {
		    tab_value = 'search';
		}
		return Object.assign({}, state, {selected_path: null, paths: {}, tab_value});
	}
	case ActionTypes.SET_EDITING_PATH:
	{
		return Object.assign({}, state, {editing_path: true});
	}
	case ActionTypes.SET_STREET_VIEW:
	{
		let panorama = action.panorama;
		return Object.assign({}, state, {panorama});
	}
	case ActionTypes.SET_INFO_WINDOW:
	{
		let info_window = action.payload;
		return Object.assign({}, state, {info_window});
	}
	case ActionTypes.SET_CENTER:
	{
		let center = action.center;
		return Object.assign({}, state, {center});
	}
	default:
	    return state;
    }
}

const reducers = combineReducers({
    main: mainReducer,
    routing: routerReducer
})

const loggerMiddleware = createLogger();

export function handleRoute(renderProps, isPathSelected, prefix, next) {
	let query = Object.assign({}, renderProps.location.query);
	if (renderProps.params.id) query.id = renderProps.params.id;
	let show_on_map = query.show || (query.id && 'first')
	delete query['show'];
	let search_form = Object.assign({}, initialState.search_form, query);
	if ((search_form.filter == 'crossing' || search_form.filter == 'hausdorff') && !isPathselected && search_form.searchPath) {
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
			if (!window.__PRELOADED_STATE__ ||  !isFirstLocation) {
				match({ routes, location: action.payload.pathname }, (err, redirect, renderProps) => {
					if (err || redirect || !renderProps) return;
					let state = store.getState();
					handleRoute(renderProps, state.main.selected_path, '/', next);
				})
			}
			isFirstLocation = false;
		}
		return next(action);
	};
}

let middlewares = [
    routerMiddleware(browserHistory),
    dataFetchMiddleware,
    thunkMiddleware,
];

if (process.env.NODE_ENV != "production") {
    middlewares.push(loggerMiddleware);
}

const createStoreWithMiddleware = applyMiddleware(
    ...middlewares
)(createStore);
 
export function configureStore(state) {
	if (state) {
		return createStoreWithMiddleware(reducers, state) 
	}
	else {
		return createStoreWithMiddleware(reducers);
	}
}

export const routes = <Route path="/" component={BodyContainer}>
  <Route path="/:id" />
</Route>
;

