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
import { getTitles, getCanonical } from '../app';

const Body = () => {
    const message  = useSelector(state => state.view.message);
    const view     = useSelector(state => state.view.view);
    const toolBoxOpened = useSelector(state => state.view.toolBoxOpened);
    const selectedItem =  useSelector(state => state.api.selectedItem);
    const isDraft = useSelector(state => state.api.isDraft);
    const dispatch = useDispatch();
    const [ state, setState ] = useState({});
    const headerRef = useRef();
    const [barHeight, setBarHeight] = useState(64);
    const TOOL_BOX_WIDTH = 160;
    const handleRequestClose = useCallback(() => {
        dispatch(openSnackbar(null));
    });
    const toggleViewCB = useCallback(() => dispatch(toggleView()));
    const shareCB = useCallback(async () => {
        try {
            const url = getCanonical(selectedItem);
            const text = getTitles(selectedItem).join(' - ');
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
    const fabStyles = useMemo(() => ({
        position: 'absolute',
        left: `calc(50% ${toolBoxOpened ? '+ 80px + env(safe-area-inset-left)/2' : ''} - 20px)`,
        margin: '0 auto',
        zIndex: 10,
        transition: 'top 0.3s, left 0.3s',
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        top: view == 'map' ? `calc(100dvh - ${barHeight + 28}px - env(safe-area-inset-bottom))` : `calc(50dvh + ${barHeight/2}px - 20px)`,
    }), [view, toolBoxOpened, barHeight]);
    const mapStyles = useMemo(() => ({
        display: 'flex',
        flexGrow: 1,
        color: '#000',
        height: view == 'map' ? '100%' : `calc(50dvh - ${barHeight/2}px)`,
    }), [view]);
    const shareButtonStyles = useMemo(() => ({
        position: 'fixed',
        right: 16,
        bottom: view == 'map' ? 'calc(56px + env(safe-area-inset-bottom))' : 16,
        transition: 'bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.1s',
        display: 'inline-flex',
    }), [view]);
    const toolBoxStyles = useMemo(() => ({
        [`& .MuiDrawer-paper`]: {
            width: `calc(${TOOL_BOX_WIDTH}px + env(safe-area-inset-left))`,
            paddingLeft: 'env(safe-area-inset-left)',
         },
    }), []);
    useEffect(() => {
        setBarHeight(headerRef.current && headerRef.current.offsetHeight);
    }, [headerRef.current && headerRef.current.offsetHeight]);
    return (
        <Box
            sx={{
                height: '100%',
            }}>
            <CssBaseline />
            <MapContext.Provider value={{state, setState}}>
                <ToolBox open={toolBoxOpened} sx={toolBoxStyles}></ToolBox>
                <Box component="main" style={{
                    height: '100%',
                    flexDirection: 'column',
                    display: view == 'map' ? 'flex' : 'block' ,
                    marginLeft: toolBoxOpened ? `calc(${TOOL_BOX_WIDTH}px + env(safe-area-inset-left))` : 0,
                    transition: 'margin 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}>
                    <NavBar ref={headerRef} sx={{pt: 'env(safe-area-inset-top)'}} />
                    <Map
                        style={mapStyles}
                    />
                    <ContentBox style={{
                        display: view == 'map' ? 'none' : 'block',
                        paddingLeft: toolBoxOpened ? 8 : 'calc(env(safe-area-inset-left) + 8px)',
                        paddingRight: 'calc(env(safe-area-inset-right) + 8px)',
                    }}/>
                    <Fab size="small" aria-label="toggle view"
                        color="secondary"
                        onClick={toggleViewCB}
                        style={fabStyles}
                    >
                        {  view == 'content' ? <ExpandMoreIcon /> : <ExpandLessIcon /> }
                    </Fab>
                    <Box sx={{
                        display: view == 'map' ? 'flex' : 'none',
                        pb: 'env(safe-area-inset-bottom)',
                    }}>
                        <BottomBar />
                    </Box>
                </Box>
                <Fab size="small" aria-label="share"
                    color="default"
                    onClick={shareCB}
                    sx={shareButtonStyles}
                    disabled={isDraft}>
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
