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
    const bodyRef = useRef(null);
    const mapRef = useRef(null);
    const bottomBarRef = useRef(null);

    const [mapHeight, setMapHeight] = useState('40vh');
    const [fabTop, setFabTop] =  useState('calc(40vh + 48px)');
    const BOTTOM_BAR_HEIGHT = 72;
    const FAB_RADIUS = 20;
    const easeInOutCubic = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    const animInterval = 15;
    const animCount = 20;
    const tween = (configs, callback) => {
        let count = 0;
        for (const config of configs) {
            const { start, formatter, setter } = config;
            setter(formatter(start));
        }
        const interval = setInterval(() => {
            count ++;
            const progress = count / animCount;
            const x = easeInOutCubic(progress);
            if (count >= animCount) clearInterval(interval);
            for (const config of configs) {
                const { start, end, complete, formatter, setter } = config;

                if (count >= animCount) {
                    setter(complete);
                } else {
                    const y = start + (end - start) * x;
                    setter(formatter(y));
                }
            }
            if (count >= animCount) callback();
        }, animInterval);
    };

    const handleRequestClose = useCallback(() => {
        dispatch(openSnackbar(null));
    });
    const toggleViewCB = useCallback(() => startTween());
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
    const fabStyles = {
        position: 'absolute',
        left: 'calc(50% - 20px)',
        margin: '0 auto',
        zIndex: 10,
        top: fabTop,
        bottom: view == 'map' ? BOTTOM_BAR_HEIGHT - FAB_RADIUS : 'auto',
    };
    const mapStyles = {
        display: 'flex',
        flexGrow: 1,
        color: '#000',
        height: mapHeight,
    };
    const shareButtonStyles = useMemo(() => ({
        position: 'fixed',
        right: 10,
        bottom: 10,
        display: view == 'map' ? 'none' : 'inline-flex',
    }), [view]);
    const theme = React.useMemo(() => createMuiTheme('light'));

    const startTween = () => {
        if (!bodyRef.current) return;
        const mapHeightFormatter = (x) => `${x}vh`;
        const fabTopFormatter = (x) => `calc(${x}vh + ${mapRef.current.offsetTop - FAB_RADIUS}px)`
        const minMapHeight = 40;
        const maxMapHeight = (bodyRef.current.clientHeight - mapRef.current.offsetTop - BOTTOM_BAR_HEIGHT) * 100 / bodyRef.current.clientHeight;

        if (view == 'map') dispatch(toggleView());

        const configs = [
            {
                start: view == 'map' ? maxMapHeight : minMapHeight,
                end: view == 'map' ? minMapHeight : maxMapHeight,
                complete: view == 'map' ? '40vh' : '100%',
                formatter: mapHeightFormatter,
                setter: setMapHeight,
            },
            {
                start: view == 'map' ? maxMapHeight : minMapHeight,
                end: view == 'map' ? minMapHeight : maxMapHeight,
                complete: view == 'map' ? fabTopFormatter(40) : 'auto' ,
                formatter: fabTopFormatter,
                setter: setFabTop,
            },
        ];
        tween(configs, () => {
            if (view != 'map') {
                dispatch(toggleView());
            }
        });
    };
    return (
        <Box
            sx={{
                height: '100%',
                flexDirection: 'column',
                display: view == 'map' ? 'flex' : 'block' ,
            }} ref={bodyRef}>
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
                    }} ref={mapRef}>
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
                }} ref={bottomBarRef}>
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
