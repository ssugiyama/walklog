import { renderToString } from 'react-dom/server';
import { setSearchForm, setSelectedPath, setSelectedItem, search, setUrlPrefix } from './actions'
import React from 'react';
import { Provider } from 'react-redux';
import {store, routes, initialState}  from './app'
import { Route,  RouterContext, match } from 'react-router'
import config from './config'

export default function handleSSR(req, res) {
    global.navigator = {
        userAgent: req.headers['user-agent']
    };
    let prefix = `http://localhost:${req.app.get("port")}/`
    match({ routes, location: req.url }, (err, redirect, renderProps) => {
        if (err) {
            res.status(500).send(err.message);
        } else if (redirect) {
            res.redirect(302, redirect.pathname + redirect.search);
        } else if (!renderProps) {
            res.status(404).send('Not found');
        } else {
            let query = Object.assign({}, req.query);
            let show_on_map = query.show || (query.id && 'first')
            delete query['show'];
            let state = store.getState();
            store.dispatch(setSelectedItem(null));
            let search_form = Object.assign({}, initialState.search_form, query);
            if ((search_form.filter == 'crossing' || search_form.filter == 'hausdorff') && !state.main.selected_path && search_form.searchPath) {
                store.dispatch(setSelectedPath(search_form.searchPath));
            }
            store.dispatch(setSearchForm(search_form));
            store.dispatch(search(search_form, show_on_map, prefix)).then(() => {  
                const html = renderToString(
                    <Provider store={store}>
                        <RouterContext {...renderProps}></RouterContext>
                    </Provider>
                )
                let state = store.getState();
                let title = config.site_name;
                let description = '';
                let google_api_key = config.google_api_key;
                if (show_on_map == 'first' && state.main.selected_item) {
                    let data = state.main.selected_item;
                    title = `${data.date} : ${data.title} (${data.length.toFixed(1)} km) - ` + title
                    description = data.comment.replace(/[\n\r]/g, '').substring(0, 40) + '...';
                }
                var bind = Object.assign({
                    html,
                    title,
                    description,
                    google_api_key,
                    preloadedState: state
                }, config);
                
                res.render('index', bind);
            });
        }
    })
}
    
