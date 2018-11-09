import React from 'react';
import { Provider } from 'react-redux';
import ReactDOM from 'react-dom';
import { ConnectedRouter } from 'connected-react-router';
import { renderRoutes } from 'react-router-config';
import { configureStore, routes, history, theme } from './app';
import { MuiThemeProvider } from '@material-ui/core/styles';
import BodyContainer from './body';

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

ReactDOM.hydrate(
    <Provider store={store}>
        <MuiThemeProvider theme={theme}>
            <ClientRoot />
        </MuiThemeProvider>
    </Provider>,
    document.querySelector('#body')
);
