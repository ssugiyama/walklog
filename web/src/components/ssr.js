import React from 'react';
import { renderToString } from 'react-dom/server';
import { Provider } from 'react-redux';
import { configureReduxStore, routes, handleRoute, createEmotionCache, createMuiTheme, getCanonical }  from '../app';
import { CacheProvider } from '@emotion/react';
import createEmotionServer from '@emotion/server/create-instance';
import { setUsers } from '../features/misc';
import { matchRoutes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import Body from './body';
import { StaticRouter } from 'react-router-dom/server';
import { renderToPipeableStream } from 'react-dom/server';
import config from 'react-global-configuration';
import * as admin from 'firebase-admin';
import { createMemoryHistory } from 'history';
import { searchFunc } from '../../lib/search';
import { getTitles } from '../app';
import * as colors from '@mui/material/colors';

const raw = content => ({ __html: content });

const definePreloadedStateAndConfig = state => raw(
    `window.__PRELOADED_STATE__ =  ${JSON.stringify(state)};
     window.__INITIAL_CONFIG__ = ${config.serialize()}`
);

const DEFAULT_THEME_COLOR      = '#1976d2';
const DEFAULT_DARK_THEME_COLOR = '#90caf9';

const Wrapper = props => (
    <html lang="en" style={{ height: '100%' }}>
        <head>
            <meta charSet="utf-8" />
            <meta name="description" content={props.description} />
            <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover" />
            <meta name="apple-mobile-web-app-capable" content="yes" />

            <meta property="og:type" content="blog" />
            <meta property="og:site_name" content={props.siteName} />
            <meta property="og:title" content={props.title} />
            <meta property="og:description" content={props.description} />
            <meta property="og:image" content={props.image} />
            <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
            <link rel="manifest" href="/manifest.json" />
            <link rel="icon" href="/favicon.ico" />
            <meta name="theme-color" content={props.theme_color} media="(prefers-color-scheme: light)" />
            <meta name="theme-color" content={props.dark_theme_color} media="(prefers-color-scheme: dark)" />
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
    if (req.query.draft == 'true') {
        return res.redirect('/');
    }
    const branch = matchRoutes(routes(), req.path);

    // const query = Object.keys(req.query).map(key => key + '=' + encodeURIComponent(req.query[key])).join('&');
    const history = createMemoryHistory({initialEntries: [req.url]});
    const store = configureReduxStore(null, history);
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
        await handleRoute(match.params.id, req.query, false, [], true, store.dispatch, searchFunc);
        const userResult =  await admin.auth().listUsers(1000);
        const users = userResult.users.map(user => {
            const { uid, displayName, photoURL } = user;
            return { uid, displayName, photoURL };
        });
        store.dispatch(setUsers(users));
        const cache = createEmotionCache();

        let context = {};
        const theme = createMuiTheme();
        const markup = renderToString(
            <Provider store={store}>
                <CacheProvider value={cache}>
                    <ThemeProvider theme={theme}>
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
        const title = getTitles(state.api.selectedItem).join(' - ');
        let description = config.get('siteDescription');
        const siteName = config.get('siteName');
        const baseUrl = config.get('baseUrl');
        let image;
        const twitterSite = config.get('twitterSite');
        const canonical = getCanonical(state.api.selectedItem);
        if (state.api.selectedItem) {
            const data = state.api.selectedItem;
            description = data.comment && (data.comment.replace(/[\n\r]/g, '').substring(0, 140) + '...');
            image = data.image;
        }
        if (! image) image = baseUrl + '/walklog.png';
        const to_color_literal = (exp) => colors[exp] ? colors[exp][500] : exp;
        const theme_color = to_color_literal(config.get('themePrimary')) || DEFAULT_THEME_COLOR;
        const dark_theme_color = to_color_literal(config.get('darkThemePrimary') || config.get('themePrimary')) || DEFAULT_DARK_THEME_COLOR;
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
            theme_color,
            dark_theme_color,
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
