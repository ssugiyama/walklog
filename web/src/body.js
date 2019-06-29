import React, { useState, useCallback, useMemo } from 'react';
import CssBaseline from '@material-ui/core/CssBaseline';
import NavBar from './nav-bar';
import Map from './map';
import BottomBar from './bottom-bar';
import WalkEditor from './walk-editor';
import { useDispatch, useSelector } from 'react-redux';
import ContentBox from './content-box';
import { openSnackbar, toggleView } from './actions';
import Snackbar from '@material-ui/core/Snackbar';
import MapContext from './map-context';
import Box from '@material-ui/core/Box';
import Fab from '@material-ui/core/Fab';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
                    
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
            height="100%"
            flexDirection="column"
            display={ view == 'map' ? 'flex' : 'block'  }>
            <MapContext.Provider value={{state, setState}}>
                <CssBaseline />
                <NavBar />
                <Box
                    pl="env(safe-area-inset-left)"
                    pr="env(safe-area-inset-right)"
                    display="flex"
                    flexDirection="column"
                    flexGrow={1}>
                    <Box
                        height={view == 'map' ? '100%' : '40vh'}
                        flexGrow={view == 'map' ? 1 : 0}
                        clone>
                        <Map />
                    </Box>
                    <Box
                        display={view == 'map' ? 'none' : 'block'} 
                        clone>
                        <ContentBox />
                    </Box>
                </Box>
                <Fab size="small" aria-label="toggle view"
                    color="secondary"
                    onClick={toggleViewCB}
                    style={fabButtonStyles}>
                    {  view == 'content' ? <ExpandMoreIcon /> : <ExpandLessIcon /> }
                </Fab>
                <Box
                    display={view == 'content' ? 'none' : 'block'} >
                    <BottomBar />
                </Box>
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
