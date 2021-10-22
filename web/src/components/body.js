import React, { useState, useCallback, useMemo } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import NavBar from './nav-bar';
import Map from './map';
import BottomBar from './bottom-bar';
import WalkEditor from './walk-editor';
import { useDispatch, useSelector } from 'react-redux';
import ContentBox from './content-box';
import { openSnackbar, toggleView } from '../actions';
import Snackbar from '@mui/material/Snackbar';
import MapContext from './utils/map-context';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const Body = () => {
    const message  = useSelector(state => state.main.message);
    const view     = useSelector(state => state.main.view);
    const dispatch = useDispatch();
    const [ state, setState ] = useState({});

    const handleRequestClose = useCallback(() => {
        dispatch(openSnackbar(null));
    });
    const toggleViewCB = useCallback(() => dispatch(toggleView()));

    const fabButtonStyles = useMemo(() => ({
        position: 'absolute',
        left: 'calc(50% - 20px)',
        margin: '0 auto',
        zIndex: 10,
        top: view == 'map' ? 'auto' : 'calc(40vh + 48px)',
        bottom: view == 'map' ? 54 : 'auto',
    }), [view]);
    return (
        <Box
            sx={{
                height: '100%',
                flexDirection: 'column',
                display: view == 'map' ? 'flex' : 'block' ,
            }}>
            <CssBaseline />
            <MapContext.Provider value={{state, setState}}>
                <NavBar />
                <Box
                    sx={{
                        pl: 'env(safe-area-inset-left)',
                        pr: 'env(safe-area-inset-right)',
                        display: 'flex',
                        flexDirection: 'column',
                        flexGrow: 1,
                    }}>

                    <Map
                        sx={{
                            height: view == 'map' ? '100%' : '40vh',
                            flexGrow: view == 'map' ? 1 : 0,
                        }} />
                    <ContentBox sx={{
                        display: view == 'map' ? 'none' : 'block',
                    }}/>

                </Box>
                <Fab size="small" aria-label="toggle view"
                    color="secondary"
                    onClick={toggleViewCB}
                    style={fabButtonStyles}>
                    {  view == 'content' ? <ExpandMoreIcon /> : <ExpandLessIcon /> }
                </Fab>
                <BottomBar sx={{
                    display: view == 'content' ? 'none' : 'block',
                }}/>
                <WalkEditor />
                <Snackbar
                    open={message != null}
                    message={message}
                    autoHideDuration={4000}
                    onClose={handleRequestClose}
                />
            </MapContext.Provider>
        </Box>
    );
};

export default Body;
