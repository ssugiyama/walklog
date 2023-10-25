import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import NavBar from './nav-bar';
import Map from './map';
import BottomBar from './bottom-bar';
import WalkEditor from './walk-editor';
import { useDispatch, useSelector } from 'react-redux';
import ContentBox from './content-box';
import { openSnackbar, toggleView } from '../features/view';
import Snackbar from '@mui/material/Snackbar';
import MapContext from './utils/map-context';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ShareIcon from '@mui/icons-material/Share';
import { ThemeProvider } from '@mui/material/styles';
import { createMuiTheme } from '../app';

const Body = () => {
    const message  = useSelector(state => state.view.message);
    const view     = useSelector(state => state.view.view);
    const dispatch = useDispatch();
    const [ state, setState ] = useState({});
    const BOTTOM_BAR_HEIGHT = 72;
    const FAB_RADIUS = 20;
    const handleRequestClose = useCallback(() => {
        dispatch(openSnackbar(null));
    });
    const toggleViewCB = useCallback(() => dispatch(toggleView()));
    const shareCB = useCallback(async () => {
        try {
            const url = location.href;
            const text = document.title;
            if (navigator.share) {
                await navigator.share({url, text});
            } else {
                await navigator.clipboard.writeText(`${text} ${url}`);
                dispatch(openSnackbar('copied to clipboard'));
            }
        } catch(error) {
            console.log(error);
        }
    });
    const mainRef = useRef();
    const fabStyles = useMemo(() => {
        const height = mainRef.current ? mainRef.current.offsetTop : 64;
        return {
            position: 'absolute',
            left: 'calc(50% - 20px)',
            margin: '0 auto',
            zIndex: 10,
            transition: 'top 0.3s ease-in-out 0.1s',
            top: view == 'map' ? `calc(100dvh - ${BOTTOM_BAR_HEIGHT + FAB_RADIUS}px)` : `calc(40dvh + ${height - FAB_RADIUS}px)`,
        };
    }, [view, mainRef.current]);
    const mapStyles = useMemo(() => ({
        display: 'flex',
        flexGrow: 1,
        color: '#000',
        height: view == 'map' ? '100%' : '40dvh',
    }), [view]);
    const shareButtonStyles = useMemo(() => ({
        position: 'fixed',
        right: 10,
        bottom: 10,
        display: view == 'map' ? 'none' : 'inline-flex',
    }), [view]);
    const theme = React.useMemo(() => createMuiTheme('light'));
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
                    }} ref={mainRef}>
                    <ThemeProvider theme={theme}>
                        <Map
                            style={mapStyles}
                        />
                    </ThemeProvider>
                    <ContentBox sx={{
                        display: view == 'map' ? 'none' : 'block',
                    }}/>
                </Box>
                <Fab size="small" aria-label="toggle view"
                    color="secondary"
                    onClick={toggleViewCB}
                    style={fabStyles}
                >
                    {  view == 'content' ? <ExpandMoreIcon /> : <ExpandLessIcon /> }
                </Fab>
                <Box sx={{
                    display: view == 'content' ? 'none' : 'block',
                }}>
                    <BottomBar style={{ height: BOTTOM_BAR_HEIGHT }}/>
                </Box>
                <Fab size="small" aria-label="share"
                    color="default"
                    onClick={shareCB}
                    style={shareButtonStyles}>
                    <ShareIcon />
                </Fab>
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
