import React from 'react';
import { renderToString } from 'react-dom/server';
import { Provider } from 'react-redux';
import {configureStore, routes, handleRoute, theme}  from './app';
import {setCurrentUser, setUsers, setMessage, openSnackbar} from './actions';
import { matchRoutes } from 'react-router-config';
import { SheetsRegistry } from 'react-jss/lib/jss';
import { MuiThemeProvider, createGenerateClassName } from '@material-ui/core/styles';
import JssProvider from 'react-jss/lib/JssProvider';
import BodyContainer from './body';
import { StaticRouter } from 'react-router-dom';
import ReactDOMServer from 'react-dom/server';

import config from './config';
import models from '../lib/models';

const Users = models.sequelize.models.users;

const definePreloadedState = state => { return {__html: 'window.__PRELOADED_STATE__ = ' + JSON.stringify(state) } };

const Wrapper = props => (
    <html lang="en" style={{ height: '100%' }}>
    <head>
        <meta charset="utf-8" />
        <meta name="description" content={props.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:site" content={props.twitter_site} />
        <meta property="og:type" content="blog" />
        <meta property="og:site_name" content={props.site_name} />
        <meta property="og:title" content={props.title} />
        <meta property="og:description" content={props.description} />
        <meta property="og:image" content={props.base_url + '/walklog.png'} />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" href="/icons/favicon-32x32.png" sizes="32x32" />
        <link rel="icon" type="image/png" href="/icons/favicon-16x16.png" sizes="16x16" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#5bbad5" />
        <link rel="shortcut icon" href="/icons/favicon.ico" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/Swiper/4.4.1/css/swiper.min.css" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="canonical" href={props.canonical} />
        <title>{props.title}</title>
    </head>
    <body style={{ margin: 0, height: '100%' }}>
        <div id="body" dangerouslySetInnerHTML={{ __html: props.markup }} style={{ height: '100%' }}></div>
        <script dangerouslySetInnerHTML={definePreloadedState(props.preloadedState)}>
        </script>
        <script src="./bundle.js"></script>
        <script type="text/javascript" async defer src="https://platform.twitter.com/widgets.js"></script>
        <script src="/register-sw.js"></script>
        <style id="jss-server-side">{props.css}</style>
    </body>
</html>);

export default function handleSSR(req, res) {
    global.navigator = {
        userAgent: req.headers['user-agent']
    };
    const prefix = `http://localhost:${req.app.get('port')}/`;
    const branch = matchRoutes(routes, req.path);
    const store = configureStore();
    const last_branch = branch[branch.length - 1];
    const match = last_branch.match;
    handleRoute(match.params.id, req.query, false, prefix, [], true, store.dispatch)
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
            const sheetsRegistry = new SheetsRegistry();
            const generateClassName = createGenerateClassName();
            const markup = renderToString(
                <Provider store={store}>
                    <JssProvider registry={sheetsRegistry} generateClassName={generateClassName}>
                        <MuiThemeProvider theme={theme} sheetsManager={new Map()}>
                            <StaticRouter location={req.url} context={context}>
                                <BodyContainer />
                            </StaticRouter>
                        </MuiThemeProvider>
                    </JssProvider>
            </Provider>);
            const css = sheetsRegistry.toString();
            const state = store.getState();
            state.main.external_links = config.external_links;
            let title = config.site_name;
            let description = config.site_description;
            const { site_name, base_url, twitter_site, google_api_key }  = config;
            let canonical = base_url + '/';
            if (state.main.selected_item) {
                const data = state.main.selected_item;
                title = `${data.date} : ${data.title} (${data.length.toFixed(1)} km) - ` + title;
                description = data.comment && (data.comment.replace(/[\n\r]/g, '').substring(0, 140) + '...');
                canonical = base_url + '/' + data.id;
            }
            const props = {
                markup,
                css,
                title,
                description,
                google_api_key,
                canonical,
                site_name,
                base_url,
                twitter_site,
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
