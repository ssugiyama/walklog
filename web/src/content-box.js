import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { withRouter } from 'react-router-dom';
import { renderRoutes } from 'react-router-config';
import { routes } from './app';
import { toggleView } from './actions';
import { push } from 'connected-react-router';

const styles = theme => ({
    root: {
        width: '100%',
    },
    hidden: {
        display: 'none',
    },
});

class ContentBox extends Component {
    constructor(props) {
        super(props);
    }
    render() {
        const { classes, view } = this.props;
        return (
            <div className={view == 'content' ? classes.root: classes.hidden}>
                { renderRoutes(routes) }
            </div>
        );
    }
}

function mapStateToProps(state) {
    const { view, highlighted_path, selected_item, center } = state.main;
    const { location } =  state.router;
    return Object.assign({}, state.main.search_form, { 
        view, highlighted_path, selected_item, center, location,
    });
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({  push, toggleView }, dispatch);
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(ContentBox)));
