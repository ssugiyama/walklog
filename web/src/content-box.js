import React, { memo } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import { withRouter } from 'react-router-dom';
import { renderRoutes } from 'react-router-config';
import { routes } from './app';


const styles = theme => ({
    root: {
        width: '100%',
    },
    hidden: {
        display: 'none',
    },
});

const ContentBox = props => {
    const { classes, view } = props;
    return (
        <div className={view == 'content' ? classes.root: classes.hidden}>
            { renderRoutes(routes) }
        </div>
    );
};

function mapStateToProps(state) {
    const { view } = state.main;
    return Object.assign({}, { 
        view, 
    });
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({  }, dispatch);
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(memo(ContentBox))));
