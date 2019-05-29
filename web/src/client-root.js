import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import ReactDOM from 'react-dom';
import { ConnectedRouter } from 'connected-react-router';
import { configureStore, history, getTheme } from './app';
import { ThemeProvider  } from '@material-ui/styles';
import BodyContainer from './body';
import config from 'react-global-configuration';

config.set(window.__INITIAL_CONFIG__);
const store = configureStore( window.__PRELOADED_STATE__);

const ClientRoot = () => {
    // Remove the server-side injected CSS.
    useEffect(() => {
        const jssStyles = document.getElementById('jss-server-side');
        if (jssStyles && jssStyles.parentNode) {
            jssStyles.parentNode.removeChild(jssStyles);
        }
    }, []);
    return <ConnectedRouter history={history}><BodyContainer /></ConnectedRouter>;  
};

ReactDOM.hydrate(
    <Provider store={store}>
        <ThemeProvider theme={getTheme()}>
            <ClientRoot />
        </ThemeProvider>
    </Provider>,
    document.querySelector('#body')
);
