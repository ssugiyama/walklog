import React from 'react';
import { renderToString } from 'react-dom/server';
import { Provider } from 'react-redux';
import {configureStore, routes, handleRoute, createEmotionCache, createMuiTheme }  from '../app';
import { CacheProvider } from '@emotion/react';
import createEmotionServer from '@emotion/server/create-instance';
import { setUsers } from '../actions';
import { matchRoutes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import Body from './body';
import { StaticRouter } from 'react-router-dom/server';
import { renderToPipeableStream } from 'react-dom/server';
import config from 'react-global-configuration';
import * as admin from 'firebase-admin';
import { createMemoryHistory } from 'history';

const raw = content => ({ __html: content });

const definePreloadedStateAndConfig = state => raw(
    `window.__PRELOADED_STATE__ =  ${JSON.stringify(state)};
     window.__INITIAL_CONFIG__ = ${config.serialize()}`
);

const Wrapper = props => (
    <html lang="en" style={{ height: '100%' }}>
        <head>
            <meta charSet="utf-8" />
            <meta name="description" content={props.description} />
            <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="twitter:card" content="summary" />
            <meta name="twitter:site" content={props.twitterSite} />
            <meta property="og:type" content="blog" />
            <meta property="og:site_name" content={props.siteName} />
            <meta property="og:title" content={props.title} />
            <meta property="og:description" content={props.description} />
            <meta property="og:image" content={props.image} />
            <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
            <link rel="icon" type="image/png" href="/icons/favicon-32x32.png" sizes="32x32" />
            <link rel="icon" type="image/png" href="/icons/favicon-16x16.png" sizes="16x16" />
            <link rel="manifest" href="/manifest.json" />
            <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#5bbad5" />
            <link rel="shortcut icon" href="/icons/favicon.ico" />
            <meta name="msapplication-config" content="/icons/browserconfig.xml" />
            <meta name="theme-color" content="#ffffff" />
            <link rel="canonical" href={props.canonical} />
            <link rel="stylesheet"  href="/client-root.css" />
            <title>{props.title}</title>
            <style data-emotion="{props.key} {props.ids.join(' ')} ">{props.css}</style>
        </head>
        <body style={{ margin: 0, height: '100%' }}>
            <div id="body" dangerouslySetInnerHTML={{ __html: props.html }} style={{ height: '100%' }}></div>
            <script dangerouslySetInnerHTML={definePreloadedStateAndConfig(props.preloadedState)}>
            </script>
            <script type="module" src="/client-root.js"></script>
            <script type="text/javascript" async defer src="https://platform.twitter.com/widgets.js"></script>
            <script src="/register-sw.js"></script>
        </body>
    </html>);

export default async function handleSSR(req, res) {
    global.navigator = {
        userAgent: req.headers['user-agent']
    };
    const prefix = `http://localhost:${req.app.get('port')}/`;
    const branch = matchRoutes(routes(), req.path);

    // const query = Object.keys(req.query).map(key => key + '=' + encodeURIComponent(req.query[key])).join('&');
    const history = createMemoryHistory({initialEntries: [req.url]});
    const store = configureStore(null, history);
    if (!branch) {
        res.status(404);
        res.send('Not Found');
        return;
    }
    const match = branch[branch.length - 1];

    if (!match || (match.url == '/' && !match.isExact)) {
        res.status(404);
        res.send('Not Found');
        return;
    }
    try {
        await handleRoute(match.params.id, req.query, false, prefix, [], true, store.dispatch);
        const userResult =  await admin.auth().listUsers(1000);
        store.dispatch(setUsers(userResult.users));
        const cache = createEmotionCache();

        let context = {};
        const markup = renderToString(
            <Provider store={store}>
                <CacheProvider value={cache}>
                    <ThemeProvider theme={createMuiTheme()}>
                        <StaticRouter location={req.url} context={context}>
                            <Body />
                        </StaticRouter>
                    </ThemeProvider>
                </CacheProvider>
            </Provider>
        );

        // Grab the CSS from emotion
        const { extractCritical } = createEmotionServer(cache);
        const { html, css, ids } = extractCritical(markup);

        const state = store.getState();
        let title = config.get('siteName');
        let description = config.get('siteDescription');
        const siteName = config.get('siteName');
        const baseUrl = config.get('baseUrl');
        let image;
        const twitterSite = config.get('twitterSite');
        let canonical = baseUrl + '/';
        if (state.main.selectedItem) {
            const data = state.main.selectedItem;
            title = `${data.date} : ${data.title} (${data.length.toFixed(1)} km) - ` + title;
            description = data.comment && (data.comment.replace(/[\n\r]/g, '').substring(0, 140) + '...');
            canonical = baseUrl + config.get('itemPrefix') + data.id;
            image = data.image;
        }
        if (! image) image = baseUrl + '/walklog.png';
        const props = {
            html,
            css,
            ids,
            key: cache.key,
            title,
            image,
            description,
            canonical,
            siteName,
            baseUrl,
            twitterSite,
            preloadedState: state
        };
        if(context.status === 404) {
            res.status(404);
        }
        res.set('Content-Type', 'text/html');
        res.write('<!DOCTYPE html>');
        renderToPipeableStream(
            <Wrapper {...props}>
            </Wrapper>
        ).pipe(res);
    } catch (error) {
        console.error(error);
    }
}
