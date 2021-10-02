import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import ReactDOM from 'react-dom';
import { ConnectedRouter } from 'connected-react-router';
import { configureStore, getTheme } from '../app';
import { ThemeProvider  } from '@material-ui/styles';
import Body from './body';
import { createBrowserHistory } from 'history';
import config from 'react-global-configuration';

config.set(window.__INITIAL_CONFIG__);
const history = createBrowserHistory();
const store = configureStore( window.__PRELOADED_STATE__, history);

const ClientRoot = () => {
    // Remove the server-side injected CSS.
    useEffect(() => {
        const jssStyles = document.getElementById('jss-server-side');
        if (jssStyles && jssStyles.parentNode) {
            jssStyles.parentNode.removeChild(jssStyles);
        }
    }, []);
    return <ConnectedRouter history={history}><Body /></ConnectedRouter>;
};

ReactDOM.hydrate(
    <Provider store={store}>
        <ThemeProvider theme={getTheme()}>
            <ClientRoot />
        </ThemeProvider>
    </Provider>,
    document.querySelector('#body')
);
