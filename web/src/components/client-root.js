import React from 'react';
import { Provider } from 'react-redux';
import ReactDOM from 'react-dom';
import { ConnectedRouter } from 'connected-react-router';
import { configureStore, createMuiTheme, createEmotionCache } from '../app';
import { ThemeProvider } from '@mui/material/styles';
import Body from './body';
import { createBrowserHistory } from 'history';
import config from 'react-global-configuration';
import { CacheProvider } from '@emotion/react';
import useMediaQuery from '@mui/material/useMediaQuery';

config.set(window.__INITIAL_CONFIG__);
const history = createBrowserHistory();
const store = configureStore( window.__PRELOADED_STATE__, history);
const cache = createEmotionCache();

const ClientRoot = () => {
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    const theme = React.useMemo(() => createMuiTheme(prefersDarkMode ? 'dark' : 'light'),
        [prefersDarkMode],
    );

    return (
        <Provider store={store}>
            <CacheProvider value={cache}>
                <ThemeProvider theme={theme}>
                    <ConnectedRouter history={history}><Body /></ConnectedRouter>
                </ThemeProvider>
            </CacheProvider>
        </Provider>
    );
};

ReactDOM.hydrate(
    <ClientRoot />,
    document.querySelector('#body')
);
