import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    openWalkEditor,
    setGeoMarker,
    openSnackbar,
} from './actions';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Divider from '@material-ui/core/Divider';
import Typography from '@material-ui/core/Typography';
// import ListItemIcon from '@material-ui/core/ListItemIcon';
// import ListItemText from '@material-ui/core/ListItemText';
// import ArrowDownIcon from '@material-ui/icons/ArrowDropDown';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import MenuIcon from '@material-ui/icons/Menu';
import Checkbox from '@material-ui/core/Checkbox';
import MyLocationIcon from '@material-ui/icons/MyLocation';
import { makeStyles } from '@material-ui/styles';
import ConfirmModal from './confirm-modal';
import {APPEND_PATH_CONFIRM_INFO} from './confirm-modal';
import MapContext from './map-context';

const styles = {
    root: {
        paddingTop: 'env(safe-area-inset-top)',
    },
    title: {
        flex: 1,
    },
    userPhoto: {
        width: 24,
        borderRadius: '50%',
    },
};

const useStyles = makeStyles(styles);

const AUTO_GEOLOCATION_INTERVAL = 30000;

const NavBar = (props) => {
    const [topAnchorEl, setTopAnchorEl] = useState(null);
    const [accountAnchorEl, setAccountAnchorEl] = useState(null);
    const [autoGeolocation, setAutoGeolocation] = useState(false);
    const [confirmInfo, setConfirmInfo] = useState({open: false});
    const context = useContext(MapContext);
    const { addPoint } = context.state;
    const dispatch = useDispatch();
    const selectedPath  = useSelector(state => state.main.selectedPath);
    const currentUser   = useSelector(state => state.main.currentUser);
    const externalLinks = useSelector(state => state.main.externalLinks);
    const classes = useStyles(props);
    const addCurrentPosition = (pos, append) => {
        setConfirmInfo({open: false});
        const geoMarker = { lat: pos.coords.latitude, lng: pos.coords.longitude, show: true };
        dispatch(setGeoMarker(geoMarker, !append));
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
        dispatch(openWalkEditor(true, 'create'));
    });
    const handleMenuOpen = (setter) => {
        return event => {
            event.stopPropagation();
            setter(event.currentTarget);
        };
    };
    const mainMenuOpenCB = useCallback(handleMenuOpen(setTopAnchorEl));
    const accountMenuOpenCB = useCallback(handleMenuOpen(setAccountAnchorEl));
    const handleMenuClose = (setter) => {
        return event => {
            event.stopPropagation();
            setter(null);
        };
    };
    const mainMenuCloseCB = useCallback(handleMenuClose(setTopAnchorEl));
    const accountMenuCloseCB = useCallback(handleMenuClose(setAccountAnchorEl));

    const handleLogin = useCallback(() => {
        window.location.href = '/auth/twitter?redirect=' +
            encodeURIComponent(window.location.href);
    });
    const handleLogout = useCallback(() => {
        window.location.href = '/auth/logout?redirect=' +
            encodeURIComponent(window.location.href);
    });
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
        setTopAnchorEl(null);
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
        <AppBar position="static" className={classes.root}>
            <Toolbar>
                <IconButton onClick={mainMenuOpenCB} color="inherit"><MenuIcon /></IconButton>
                <Typography variant="h5" color="inherit" className={classes.title}>Walklog</Typography>
                <Checkbox
                    icon={<MyLocationIcon />}
                    checkedIcon={<MyLocationIcon />}
                    checked={autoGeolocation}
                    onChange={handleAutoGeolocationChange}
                    onClick={ignoreClick}
                    value="autoGeolocation"
                />
                <IconButton onClick={accountMenuOpenCB} color="inherit">
                    { currentUser ? <img className={classes.userPhoto} src={currentUser.photo} /> : <AccountCircleIcon /> }
                </IconButton>
            </Toolbar>
            <Menu
                anchorEl={topAnchorEl}
                open={Boolean(topAnchorEl)}
                onClose={mainMenuCloseCB}
            >
                {
                    externalLinks.map(link =>
                        <EndMenuItem component="a" href={link[1]} target="_blank" key={link[0]} >{link[0]}</EndMenuItem>
                    )
                }
            </Menu>
            <Menu
                anchorEl={accountAnchorEl}
                open={Boolean(accountAnchorEl)}
                onClose={accountMenuCloseCB}
            >
                {
                    currentUser ? [
                        (<MenuItem key="label" disabled={true}>Logged in as {currentUser.username}</MenuItem>),
                        (<Divider key="divider" />),
                        (<EndMenuItem key="new walk" onClick={handleNewWalk} disabled={selectedPath == null}>new walk...</EndMenuItem>),
                        (<EndMenuItem key="logout" onClick={handleLogout}>logout</EndMenuItem>)
                    ] : [<EndMenuItem key="login" onClick={handleLogin}>login with twitter</EndMenuItem>]
                }
            </Menu>
            <ConfirmModal {...APPEND_PATH_CONFIRM_INFO} open={confirmInfo.open} resolve={confirmInfo.resolve} />
        </AppBar>
    );
};

export default NavBar;
