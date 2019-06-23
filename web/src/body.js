import React, { useState, useCallback, memo } from 'react';
import CssBaseline from '@material-ui/core/CssBaseline';
import NavBar from './nav-bar';
import Map from './map';
import BottomBar from './bottom-bar';
import WalkEditor from './walk-editor';
import { useDispatch, useSelector } from 'react-redux';
import ContentBox from './content-box';
import { openSnackbar } from './actions';
import Snackbar from '@material-ui/core/Snackbar';
import { makeStyles } from '@material-ui/styles';
import classNames from 'classnames';
import MapContext from './map-context';

const styles = () => ({
    root: {
        height: '100%',
    },
    rootMap: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
    },
});

const useStyles = makeStyles(styles);

const Body = props => {
    const message  = useSelector(state => state.main.message);
    const view     = useSelector(state => state.main.view);
    const dispatch = useDispatch();
    const classes = useStyles(props);
    const [ state, setState ] = useState({});

    const handleRequestClose = useCallback(() => {
        dispatch(openSnackbar(null));
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
                <NavBar />
                <Map />
                <ContentBox />
                { view == 'map' && <BottomBar /> }
                <WalkEditor />
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

export default Body;
