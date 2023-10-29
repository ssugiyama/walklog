import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import NavBar from './nav-bar';
import ToolBox from './tool-box';
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

const Body = () => {
    const message  = useSelector(state => state.view.message);
    const view     = useSelector(state => state.view.view);
    const toolBoxOpened = useSelector(state => state.view.toolBoxOpened);
    const dispatch = useDispatch();
    const [ state, setState ] = useState({});
    const BOTTOM_BAR_HEIGHT = 48;
    const TOOL_BOX_WIDTH = 160;
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
    const [headerHeight, setHeaderHeight] = useState(64);
    const fabStyles = useMemo(() => ({
            position: 'absolute',
            left: `calc(50% ${toolBoxOpened ? '+ 80px' : ''} - 20px)`,
            margin: '0 auto',
            zIndex: 10,
            transition: 'top 0.3s, left 0.3s',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
            top: view == 'map' ? `calc(100dvh - ${BOTTOM_BAR_HEIGHT + 28}px - env(safe-area-inset-bottom))` : `calc(40dvh + ${headerHeight - 20}px)`,
    }), [view, toolBoxOpened, headerHeight]);
    const mapStyles = useMemo(() => ({
        display: 'flex',
        flexGrow: 1,
        color: '#000',
        height: view == 'map' ? '100%' : '40dvh',
    }), [view]);
    const shareButtonStyles = useMemo(() => ({
        position: 'fixed',
        right: 2,
        right: 16,
        bottom: `calc(${view == 'map' ? 40 : 16}px + env(safe-area-inset-bottom))`,
        transition: 'bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.1s',
        display: 'inline-flex',
    }), [view]);
    const toolBoxStyles = useMemo(() => ({
        width: TOOL_BOX_WIDTH,
        [`& .MuiDrawer-paper`]: {
            width: TOOL_BOX_WIDTH,
         },
    }), [mainRef.current]);
    useEffect(() => {
        setHeaderHeight(mainRef.current.offsetTop)
    }, [mainRef.current && mainRef.current.offsetTop]);
    return (
        <Box
            sx={{
                height: '100%',
            }}>
            <CssBaseline />
            <MapContext.Provider value={{state, setState}}>
                <ToolBox open={toolBoxOpened} sx={toolBoxStyles}></ToolBox>
                <main style={{
                    height: '100%',
                    flexDirection: 'column',
                    display: view == 'map' ? 'flex' : 'block' ,
                    marginLeft: toolBoxOpened ? TOOL_BOX_WIDTH : 0,
                    transition: 'margin 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}>
                    <NavBar sx={{pt: 'env(safe-area-inset-top)'}} />
                    <Box
                        sx={{
                            pl: 'env(safe-area-inset-left)',
                            pr: 'env(safe-area-inset-right)',
                            display: 'flex',
                            flexDirection: 'column',
                            flexGrow: 1,
                        }} ref={mainRef}>
                        <Map
                            style={mapStyles}
                        />
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
                        <BottomBar sx={{ height: BOTTOM_BAR_HEIGHT, pb: 'env(safe-area-inset-bottom)' }}/>
                    </Box>
                </main>
                <Fab size="small" aria-label="share"
                    color="default"
                    onClick={shareCB}
                    sx={shareButtonStyles}>
                    <ShareIcon />
                </Fab>
                <WalkEditor sx={{ pb: 'env(safe-area-inset-bottom)' }} />
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
