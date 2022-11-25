import React, { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setGeoMarker } from '../features/map';
import {
    openWalkEditor,
    openSnackbar,
} from '../features/view';
import { setCurrentUser } from '../features/misc';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
// import ListItemIcon from '@mui/material/ListItemIcon';
// import ListItemText from '@mui/material/ListItemText';
// import ArrowDownIcon from '@mui/icons-material/ArrowDropDown';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ShareIcon from '@mui/icons-material/Share';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import ConfirmModal from './confirm-modal';
import {APPEND_PATH_CONFIRM_INFO} from './confirm-modal';
import MapContext from './utils/map-context';
import firebase from 'firebase/app'
import config from 'react-global-configuration';
import 'firebase/auth';

const AUTO_GEOLOCATION_INTERVAL = 30000;

const NavBar = () => {
    const provider = useRef();
    const [accountAnchorEl, setAccountAnchorEl] = useState(null);
    const [autoGeolocation, setAutoGeolocation] = useState(false);
    const [confirmInfo, setConfirmInfo] = useState({open: false});
    const context = useContext(MapContext);
    const { addPoint } = context.state;
    const dispatch = useDispatch();
    const selectedPath  = useSelector(state => state.map.selectedPath);
    const currentUser   = useSelector(state => state.misc.currentUser);
    const appVersion = 'v' + config.get('appVersion');
    const addCurrentPosition = (pos, append) => {
        setConfirmInfo({open: false});
        const geoMarker = { lat: pos.coords.latitude, lng: pos.coords.longitude, show: true, updateCenter: !append };
        dispatch(setGeoMarker(geoMarker));
        addPoint(pos.coords.latitude, pos.coords.longitude, append);
    };
    const getCurrentPosition = (onSuccess, onFailure) => {
        navigator.geolocation.getCurrentPosition( pos => {
            onSuccess(pos);
        }, () => {
            if (onFailure) onFailure();
        });
    };
    const handleNewWalk = useCallback(() => {
        dispatch(openWalkEditor({ open: true, mode: 'create' }));
    });
    const handleMenuOpen = (setter) => {
        return event => {
            event.stopPropagation();
            setter(event.currentTarget);
        };
    };
    const accountMenuOpenCB = useCallback(handleMenuOpen(setAccountAnchorEl));
    const handleMenuClose = (setter) => {
        return event => {
            event.stopPropagation();
            setter(null);
        };
    };
    const accountMenuCloseCB = useCallback(handleMenuClose(setAccountAnchorEl));

    const handleLogin = useCallback(() => {
        firebase.auth().signInWithPopup(provider.current).catch(error => {
            dispatch(openSnackbar(error.message));
        });
    });
    const handleLogout = useCallback(() => {
        firebase.auth().signOut().catch(error => {
            dispatch(openSnackbar(error.message));
        });
    });
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
    useEffect(() =>{
        if (firebase.apps.length == 0) {
            firebase.initializeApp(config.get('firebaseConfig'));
        }
        if (firebase.apps.length > 0) {
            provider.current = new firebase.auth.GoogleAuthProvider();
            firebase.auth().onAuthStateChanged(user => {
                dispatch(setCurrentUser(user));
            });
        }
    }, []);
    const ignoreClick = useCallback(event => {
        event.stopPropagation();
        return false;
    });
    useEffect(() => {
        if (autoGeolocation) {
            const intervalId = setInterval(() => {
                getCurrentPosition(pos => {
                    addCurrentPosition(pos, true);
                });
            }, AUTO_GEOLOCATION_INTERVAL);
            return () => {
                clearInterval(intervalId);
            };
        }
    }, [autoGeolocation]);
    const handleAutoGeolocationChange = useCallback((event, value) => {
        if (value && navigator.geolocation) {
            getCurrentPosition(async pos => {
                setAutoGeolocation(true);
                dispatch(openSnackbar('start following your location'));
                const append = await new Promise((resolve) => {
                    if (selectedPath) {
                        setConfirmInfo({open: true, resolve});
                    }
                    else {
                        resolve(false);
                    }
                });
                addCurrentPosition(pos, append);
            }, () => {
                alert('Unable to retrieve your location');
            });
        } else if (value) {
            alert('Geolocation is not supported by your browser');
        } else {
            setAutoGeolocation(false);
            dispatch(openSnackbar('stop following your location'));
        }
    });
    const closeAllMenus = () => {
        setAccountAnchorEl(null);
    };
    const EndMenuItem = props => {
        const onClick = props.onClick;
        const cpProps = Object.assign({}, props);
        delete cpProps.onClick;
        return <MenuItem onClick={() => {
            closeAllMenus();
            if (onClick) onClick();
            return true;
        }} {...cpProps}>{props.children}</MenuItem> ;
    };
    // const ParentMenuItem = props => {
    //     const subMenuAnchor = props.subMenuAnchor;
    //     return <MenuItem key="path" onClick={handleMenuOpen(subMenuAnchor)}>
    //         <ListItemText>{props.children}</ListItemText>
    //         <ListItemIcon>
    //             <ArrowDownIcon />
    //         </ListItemIcon>
    //     </MenuItem>;
    // } ;
    return (
        <AppBar position="static" enableColorOnDark={true} sx={{pt: 'env(safe-area-inset-top)'}}>
            <Toolbar>
                <Typography variant="h5" color="inherit" sx={{flex: 1}}>Walklog</Typography>
                <Checkbox
                    icon={<MyLocationIcon />}
                    checkedIcon={<MyLocationIcon />}
                    checked={autoGeolocation}
                    onChange={handleAutoGeolocationChange}
                    onClick={ignoreClick}
                    value="autoGeolocation"
                />
                <IconButton onClick={shareCB} color="inherit" size="large">
                    <ShareIcon />
                </IconButton>
                <IconButton onClick={accountMenuOpenCB} color="inherit" size="large">
                    { currentUser ? <img alt='user profile' style={{width: 24, borderRadius: '50%',}} src={currentUser.photoURL} /> : <AccountCircleIcon /> }
                </IconButton>
                <Button component="a" href="https://github.com/ssugiyama/walklog" target="_blank" color="inherit" sx={{textTransform: 'none',}}>{appVersion}</Button>
            </Toolbar>
            <Menu
                anchorEl={accountAnchorEl}
                open={Boolean(accountAnchorEl)}
                onClose={accountMenuCloseCB}
            >
                {
                    currentUser ? [
                        (<MenuItem key="label" disabled={true}>Logged in as {currentUser.displayName}</MenuItem>),
                        (<Divider key="divider" />),
                        (<EndMenuItem key="new walk" onClick={handleNewWalk} disabled={selectedPath == null}>new walk...</EndMenuItem>),
                        (<EndMenuItem key="logout" onClick={handleLogout}>logout</EndMenuItem>)
                    ] : [<EndMenuItem key="login" onClick={handleLogin}>login with Google</EndMenuItem>]
                }
            </Menu>
            <ConfirmModal {...APPEND_PATH_CONFIRM_INFO} open={confirmInfo.open} resolve={confirmInfo.resolve} />
        </AppBar>
    );
};

export default NavBar;
