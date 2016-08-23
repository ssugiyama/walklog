require('./twitter.js');
const injectTapEventPlugin = require("react-tap-event-plugin");
injectTapEventPlugin();

import { Provider } from 'react-redux'
import thunkMiddleware from 'redux-thunk';
import createLogger from 'redux-logger';
import { createStore, applyMiddleware, combineReducers } from 'redux';
import { search, setSearchForm, setSelectedPath } from './actions';
import * as ActionTypes from './action-types'
import React  from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, IndexRoute, browserHistory } from 'react-router'
import { syncHistoryWithStore, routerReducer, LOCATION_CHANGE, routerMiddleware } from 'react-router-redux'
const loggerMiddleware = createLogger();

const dataFetchMiddleware = store => next => {
    return action => {
        // Fetch data on update location
	if (action.type === LOCATION_CHANGE) {
	    let state = store.getState();
	    let query = Object.assign({}, action.payload.query);
	    let show_on_map = query.show || (query.id && 'first')
	    delete query['show'];
	    let search_form = Object.assign({}, initialState.search_form, query);
	    if ((search_form.filter == 'crossing' || search_form.filter == 'hausdorff') && !state.main.selected_path && search_form.searchPath) {
		next(setSelectedPath(search_form.searchPath));
	    }
	    next(setSearchForm(search_form));
	    next(search(search_form, show_on_map));
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
    component_procs: {
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
    paths: new Set(),
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
		let paths = new Set(state.paths);
		paths.add(selected_path);
		let tab_value;
		if (!selected_item) {
		    tab_value = 'search';
		}
		else {
		    tab_value = 'comment';
		}
		let search_form = Object.assign({}, state.search_form, {searchPath: selected_path });
		return Object.assign({}, state, {search_form, selected_item, selected_index, tab_value, selected_path, paths});
	    }
        case ActionTypes.SET_SELECTED_PATH:
	    {
		let selected_path = action.path;
		let tab_value = state.tab_value;
		let paths = new Set(state.paths);
		if (selected_path) paths.add(selected_path);
		if (!selected_path && tab_value == 'visualization') {
		    tab_value = 'search';
		}
		let search_form = Object.assign({}, state.search_form, {searchPath: selected_path });
		return Object.assign({}, state, {selected_path, search_form, tab_value, editing_path: false});
	    }
	case ActionTypes.OPEN_SIDEBAR:
	    {
		let open_sidebar = action.open;
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
		let paths = new Set(state.paths);
		for (let path of action.paths) {
		    paths.add(path);
		}
		return Object.assign({}, state, {paths});
	    }
	case ActionTypes.DELETE_SELECTED_PATH:
	    {
		let tab_value = state.tab_value;
		let paths = new Set(state.paths);
		paths.delete(state.selected_path);
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
		return Object.assign({}, state, {selected_path: null, paths: new Set(), tab_value});
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

const reducer = combineReducers({
    main: mainReducer,
    routing: routerReducer
})

const store = createStoreWithMiddleware(reducer);

const history = syncHistoryWithStore(browserHistory, store)

import BodyContainer from './body'
ReactDOM.render(
    <Provider store={store}>
      <Router history={history}>
        <Route path="/" component={BodyContainer} />
      </Router>
    </Provider>,
    document.querySelector('#body')
);
