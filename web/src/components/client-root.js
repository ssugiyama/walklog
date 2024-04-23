/* eslint no-underscore-dangle: 'off' */
import React from 'react';
import { Provider } from 'react-redux';
import { hydrateRoot } from 'react-dom/client';
import { ReduxRouter } from '@lagunovsky/redux-react-router';
import { ThemeProvider } from '@mui/material/styles';
import { createBrowserHistory } from 'history';
import config from 'react-global-configuration';
import { CacheProvider } from '@emotion/react';
import useMediaQuery from '@mui/material/useMediaQuery';
import Body from './body';
import { configureReduxStore, createMuiTheme, createEmotionCache } from '../app';

config.set(window.__INITIAL_CONFIG__);
const history = createBrowserHistory();
const store = configureReduxStore(window.__PRELOADED_STATE__, history);
const cache = createEmotionCache();

const ClientRoot = () => {
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    const theme = React.useMemo(
        () => createMuiTheme(prefersDarkMode ? 'dark' : 'light'),
        [prefersDarkMode],
    );

    return (
        <Provider store={store}>
            <CacheProvider value={cache}>
                <ThemeProvider theme={theme}>
                    <ReduxRouter history={history}><Body /></ReduxRouter>
                </ThemeProvider>
            </CacheProvider>
        </Provider>
    );
};

hydrateRoot(
    document.querySelector('#body'),
    <ClientRoot />,
);
