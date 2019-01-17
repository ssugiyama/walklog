import React from 'react';
import { Provider } from 'react-redux';
import ReactDOM from 'react-dom';
import { ConnectedRouter } from 'connected-react-router';
import { configureStore, history, getTheme } from './app';
import { MuiThemeProvider, createGenerateClassName } from '@material-ui/core/styles';
import BodyContainer from './body';
import JssProvider from 'react-jss/lib/JssProvider';
import config from 'react-global-configuration';

config.set(window.__INITIAL_CONFIG__);
const store = configureStore( window.__PRELOADED_STATE__);

class ClientRoot extends React.Component {
    // Remove the server-side injected CSS.
    componentDidMount() {
        const jssStyles = document.getElementById('jss-server-side');
        if (jssStyles && jssStyles.parentNode) {
            jssStyles.parentNode.removeChild(jssStyles);
        }
    }
    render() {
        return <ConnectedRouter history={history}><BodyContainer /></ConnectedRouter>;
    }
}

const generateClassName = createGenerateClassName();
ReactDOM.hydrate(
    <Provider store={store}>
        <JssProvider generateClassName={generateClassName}>
            <MuiThemeProvider theme={getTheme()}>
                <ClientRoot />
            </MuiThemeProvider>
        </JssProvider>
    </Provider>,
    document.querySelector('#body')
);
