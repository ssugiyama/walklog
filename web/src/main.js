window.jQuery = window.$ = require('jquery');
require('bootstrap/dist/css/bootstrap.css');
require('bootstrap/dist/js/bootstrap.js');
require('./application.scss');
require('jquery-flot/jquery.flot.js');
require('jquery-flot/jquery.flot.resize.js');
require('./twitter.js');

import { Provider } from 'react-redux'
import thunkMiddleware from 'redux-thunk';
import createLogger from 'redux-logger';
import { createStore, applyMiddleware, combineReducers } from 'redux';
import * as ActionTypes from './action-types'
import React  from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, IndexRoute, browserHistory } from 'react-router'
import { syncHistoryWithStore, routerReducer, LOCATION_CHANGE, routerMiddleware } from 'react-router-redux'
const loggerMiddleware = createLogger();

let middlewares = [
    thunkMiddleware, 
    routerMiddleware(browserHistory)
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
	openWalkEditor: null,
    },
    do_search: true,
    show_on_map: false,    
    result: {
	rows: [],
	count: 0,
	params: '',
	show_distance: false,
    },
    years: years,
    additional_view: null,
    selected_item: null,
    selected_path: null,
    selected_index: -1,
}

const mainReducer = function(state = initialState, action) {
    let result;
        
    switch (action.type) {
	case LOCATION_CHANGE:
	    let query = Object.assign({}, action.payload.query);
	    let show_on_map = query.show || (query.id && 'first')
	    delete query['show'];
	    let search_form = Object.assign({}, initialState.search_form, query);
	    return Object.assign({}, state, {search_form, do_search: true, show_on_map});
	case ActionTypes.SET_SEARCH_FORM:
	    if (action.payload.filter == 'hausdorff') {
		action.payload.order = 'nearest_first';
	    }
	    else if (state.search_form.order == 'nearest_first') {
		action.payload.order = 'newest_first';
	    }
	    search_form = Object.assign({}, state.search_form, action.payload);
	    return Object.assign({}, state, {search_form});
	case ActionTypes.SET_COMPONENT_PROCS:
	    let component_procs = Object.assign({}, state.component_procs, action.payload);
	    return Object.assign({}, state, {component_procs});	    
	case ActionTypes.SEARCH_START:
	    if (action.clear) {
		result = { rows: [], count: 0, params: '' };
		return Object.assign({}, state, {result, do_search: false});
	    }
	    else {
		return state;
	    }
	case ActionTypes.SEARCH_RESULT:
	    if (action.append) {
		result = { rows: state.result.rows.concat(action.data.rows), count: state.result.count, params: action.data.params };
	    }
	    else {
		result = { rows: action.data.rows, count: action.data.count, params: action.data.params };
	    }
	    return Object.assign({}, state, {result});
	case ActionTypes.SET_PATH_MANAGER:
	    let manager = action.manager;
	    return Object.assign({}, state, {path_manager: manager});
        case ActionTypes.SET_ADDITIONAL_VIEW:
	    let view = action.view;
	    return Object.assign({}, state, {additional_view: view});
        case ActionTypes.SET_SELECTED_ITEM:
	    let selected_item = action.item;
	    let additional_view = state.additional_view;
	    if (selected_item == null && state.additional_view == 'comment' ) {
		additional_view = null;
	    }	    
	    return Object.assign({}, state, {selected_item, additional_view});
        case ActionTypes.SET_SELECTED_INDEX:
	    let selected_index = action.index;
	    return Object.assign({}, state, {selected_index});	    
        case ActionTypes.SET_SELECTED_PATH:
	    let selected_path = action.path;
	    search_form = Object.assign({}, state.search_form, {searchPath: selected_path ? google.maps.geometry.encoding.encodePath(selected_path.getPath()) : null });
	    additional_view = state.additional_view;
	    if (selected_path == null && state.additional_view == 'elevation' || state.additional_view == 'panorama' ) {
		additional_view = null;
	    }
	    return Object.assign({}, state, {selected_path, search_form, additional_view});	    
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
