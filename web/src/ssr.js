import React from 'react';
import { renderToString } from 'react-dom/server';
import { Provider } from 'react-redux';
import {configureStore, routes, handleRoute, getTheme}  from './app';
import {setCurrentUser, setUsers, openSnackbar} from './actions';
import { matchRoutes } from 'react-router-config';
import { ServerStyleSheets, ThemeProvider } from '@material-ui/styles';
import BodyContainer from './body';
import { StaticRouter } from 'react-router-dom';
import ReactDOMServer from 'react-dom/server';
import config from 'react-global-configuration';
import models from '../lib/models';

const Users = models.sequelize.models.users;

const raw = content => ({ __html: content });

const definePreloadedStateAndConfig = state => raw(
    `window.__PRELOADED_STATE__ =  ${JSON.stringify(state)};
     window.__INITIAL_CONFIG__ = ${config.serialize()}`
);

const Wrapper = props => (
    <html lang="en" style={{ height: '100%' }}>
        <head>
            <meta charset="utf-8" />
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
            <title>{props.title}</title>
            <style id="jss-server-side" dangerouslySetInnerHTML={raw(props.css)}></style>
        </head>
        <body style={{ margin: 0, height: '100%' }}>
            <div id="body" dangerouslySetInnerHTML={{ __html: props.markup }} style={{ height: '100%' }}></div>
            <script dangerouslySetInnerHTML={definePreloadedStateAndConfig(props.preloadedState)}>
            </script>
            <script src="./bundle.js"></script>
            <script type="text/javascript" async defer src="https://platform.twitter.com/widgets.js"></script>
            <script src="/register-sw.js"></script>
        </body>
    </html>);

export default function handleSSR(req, res) {
    global.navigator = {
        userAgent: req.headers['user-agent']
    };
    const prefix = `http://localhost:${req.app.get('port')}/`;
    const branch = matchRoutes(routes, req.path);
    const store = configureStore();
    const lastBranch = branch[branch.length - 1];
    const match = lastBranch.match;
    handleRoute(match.params.id, req.query, false, prefix, [], true, store.dispatch)
        .then(() =>{
            if (req.session.messages && req.session.messages.length > 0) {
                const msg = req.session.messages.pop() || '';
                store.dispatch(openSnackbar(msg, false));
            }
        }).then(() => store.dispatch(setCurrentUser(req.user)))
        .then(() => Users.findAll().then(users => store.dispatch(setUsers(users))))
        .then(() => {
            let context = {};
            const sheets = new ServerStyleSheets();
            const markup = renderToString(
                sheets.collect(
                    <Provider store={store}>
                        <ThemeProvider theme={getTheme()}>
                            <StaticRouter location={req.url} context={context}>
                                <BodyContainer />
                            </StaticRouter>
                        </ThemeProvider>
                    </Provider>
                )
            );
            const css = sheets.toString();
            const state = store.getState();
            state.main.externalLinks = config.get('external_links');
            let title = config.get('site_name');
            let description = config.get('site_description');
            const siteName =config.get('site_name');
            const baseUrl = config.get('base_url');
            let image;
            const twitterSite = config.get('twitter_site');
            let canonical = baseUrl + '/';
            if (state.main.selectedItem) {
                const data = state.main.selectedItem;
                title = `${data.date} : ${data.title} (${data.length.toFixed(1)} km) - ` + title;
                description = data.comment && (data.comment.replace(/[\n\r]/g, '').substring(0, 140) + '...');
                canonical = baseUrl + '/' + data.id;
                image = data.image;
            }
            if (! image) image = baseUrl + '/walklog.png';
            const props = {
                markup,
                css,
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
            ReactDOMServer.renderToStaticNodeStream(
                <Wrapper {...props}>
                </Wrapper>
            ).pipe(res);
        }).catch(ex => console.log(ex));
}
