require('./twitter.js');

import React from 'react';
import { Provider } from 'react-redux';
import ReactDOM from 'react-dom';
import { ConnectedRouter } from 'react-router-redux';
import { renderRoutes } from 'react-router-config';
import { configureStore, routes, history } from './app';

const store = configureStore( window.__PRELOADED_STATE__);


ReactDOM.render(
    <Provider store={store}>
        <ConnectedRouter history={history}>
            { renderRoutes(routes) }     
        </ConnectedRouter>
    </Provider>,
    document.querySelector('#body')
);
