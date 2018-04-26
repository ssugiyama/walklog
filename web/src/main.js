require('./twitter.js');

import React from 'react';
import { Provider } from 'react-redux';
import ReactDOM from 'react-dom';
import { ConnectedRouter } from 'react-router-redux';
import { renderRoutes } from 'react-router-config';
import { configureStore, routes, history } from './app';
import { MuiThemeProvider, createMuiTheme } from 'material-ui/styles';
import BodyContainer from './body';

const store = configureStore( window.__PRELOADED_STATE__);

class Main extends React.Component {
    // Remove the server-side injected CSS.
    componentDidMount() {
        const jssStyles = document.getElementById('jss-server-side');
        if (jssStyles && jssStyles.parentNode) {
            jssStyles.parentNode.removeChild(jssStyles);
        }
    }
  
    render() {
        return <BodyContainer />;
    }
}
  
// Create a theme instance.
const theme = createMuiTheme();

ReactDOM.render(
    <Provider store={store}>
        <MuiThemeProvider theme={theme}>
            <Main />
        </MuiThemeProvider>
    </Provider>,
    document.querySelector('#body')
);
