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
import { syncHistoryWithStore, routerMiddleware, LOCATION_CHANGE } from 'react-router-redux'
import reducers from './reducers';

const loggerMiddleware = createLogger();

const dataFetchMiddleware = store => next => {
    return action => {
        // Fetch data on update location
	if (action.type === LOCATION_CHANGE) {
	    let state = store.getState();
	    let query = Object.assign({}, action.payload.query);
	    let show_on_map = query.show || (query.id && 'first')
	    delete query['show'];
	    let search_form = Object.assign({}, state.search_form, query);
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

const preloadedState = window.__PRELOADED_STATE__
const store = createStoreWithMiddleware(reducers, preloadedState);

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
