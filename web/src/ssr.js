import React from 'react';
import { renderToString } from 'react-dom/server';
import { Provider } from 'react-redux';
import {configureStore, routes, handleRoute}  from './app';
import {setCurrentUser, setUsers, setMessage, openSnackbar} from './actions';
import { StaticRouter } from 'react-router-dom';
import { renderRoutes, matchRoutes } from 'react-router-config';

import config from './config';
import models from '../lib/models';

const Users = models.sequelize.models.users;

export default function handleSSR(req, res) {
    global.navigator = {
        userAgent: req.headers['user-agent']
    };
    const prefix = `http://localhost:${req.app.get('port')}/`;
    const branch = matchRoutes(routes, req.url);
    console.log(branch)
    const store = configureStore();
    handleRoute(branch, req.query, false, prefix, [], store.dispatch)
        .then(() =>{
            if (req.session.messages && req.session.messages.length > 0) {
                const msg = req.session.messages.pop() || '';
                store.dispatch(setMessage(msg));
                store.dispatch(openSnackbar(true));
            }
        }).then(() => store.dispatch(setCurrentUser(req.user)))
        .then(() => Users.findAll().then(users => store.dispatch(setUsers(users))))
        .then(() => {
            let context = {};
            const html = renderToString(
                <Provider store={store}>
                    <StaticRouter location={req.url} context={context}>
                        {renderRoutes(routes)}
                    </StaticRouter>
                </Provider>
            );
            const state = store.getState();
            state.main.external_links = config.external_links;
            let title = config.site_name;
            let description = '';
            const google_api_key = config.google_api_key;
            let canonical = '/';
            if (state.main.selected_item) {
                let data = state.main.selected_item;
                title = `${data.date} : ${data.title} (${data.length.toFixed(1)} km) - ` + title;
                description = data.comment.replace(/[\n\r]/g, '').substring(0, 140) + '...';
                canonical = '/' + data.id;
            }
            const bind = Object.assign({
                html,
                title,
                description,
                google_api_key,
                canonical,
                preloadedState: state
            }, config);
            res.render('index', bind);
        }).catch(ex => console.log(ex));
}