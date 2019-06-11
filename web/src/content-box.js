import React, { memo } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { makeStyles } from '@material-ui/styles';
import { withRouter } from 'react-router-dom';
import { renderRoutes } from 'react-router-config';
import { routes } from './app';

const styles = () => ({
    root: {
        width: '100%',
    },
    hidden: {
        display: 'none',
    },
});

const useStyles = makeStyles(styles);

const ContentBox = props => {
    const { view } = props;
    const classes = useStyles(props);
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

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(memo(ContentBox)));
