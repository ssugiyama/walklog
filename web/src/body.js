import React, { useState, useCallback } from 'react';
import CssBaseline from '@material-ui/core/CssBaseline';
import NavBarContainer from './nav-bar';
import MapContainer from './map';
import BottomBarContainer from './bottom-bar';
import WalkEditorContainer from './walk-editor';;
import { connect } from 'react-redux';
import ContentBoxContainer from './content-box';
import { bindActionCreators } from 'redux';
import { openSnackbar } from './actions';
import Snackbar from '@material-ui/core/Snackbar';
import { withStyles } from '@material-ui/core/styles';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';
import MapContext from './map-context';

const styles = theme => ({
    root: {
        height: '100%',
    },
    rootMap: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
    },
});

const Body = props => {
    const { openSnackbar  } = props;
    const { message, view, classes } = props;
    const [ state, setState ] = useState({});

    const handleRequestClose = useCallback(() => {
        openSnackbar(null);
    });
  
    return (
        <div className={classNames(
            classes.root,
            {
                [classes.rootMap]: view == 'map',
            }
        )}>
            <MapContext.Provider value={{state, setState}}>
                <CssBaseline />
                <NavBarContainer />
                <MapContainer />
                <ContentBoxContainer />
                { view == 'map' && <BottomBarContainer /> }
                <WalkEditorContainer />
                <Snackbar
                    open={message != null}
                    message={message}
                    autoHideDuration={4000}
                    onClose={handleRequestClose}
                />
            </MapContext.Provider>
        </div>
    );
};

function mapStateToProps(state) {
    const { message, view } = state.main;
    return { message, view };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({openSnackbar}, dispatch);
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(Body)));
