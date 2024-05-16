import React, {
    useEffect, useState, useCallback, useRef, forwardRef,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Button from '@mui/material/Button';
import MenuIcon from '@mui/icons-material/Menu';
import {
    initializeApp,
} from 'firebase/app';
import {
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut,
} from "firebase/auth";
import config from 'react-global-configuration';
import { setCurrentUser } from '../features/misc';
import {
    openWalkEditor,
    openSnackbar,
    openToolBox,
} from '../features/view';

const NavBar = (props, ref) => {
    const provider = useRef();
    const [accountAnchorEl, setAccountAnchorEl] = useState(null);
    const dispatch = useDispatch();
    const selectedPath = useSelector((state) => state.map.selectedPath);
    const currentUser = useSelector((state) => state.misc.currentUser);
    const overlay = useSelector((state) => state.view.overlay);
    const appVersion = `v${config.get('appVersion')}`;
    const handleNewWalk = useCallback(() => {
        dispatch(openWalkEditor({ open: true, mode: 'create' }));
    }, []);
    const toolBoxOpened = useSelector((state) => state.view.toolBoxOpened);
    const handleMenuOpen = (setter) => (event) => {
        event.stopPropagation();
        setter(event.currentTarget);
    };
    const accountMenuOpenCB = useCallback(handleMenuOpen(setAccountAnchorEl), []);
    const handleMenuClose = (setter) => (event) => {
        event.stopPropagation();
        setter(null);
    };
    const accountMenuCloseCB = useCallback(handleMenuClose(setAccountAnchorEl), []);

    const handleLogin = useCallback(() => {
        signInWithPopup(getAuth(), provider.current).catch((error) => {
            dispatch(openSnackbar(error.message));
        });
    }, []);
    const handleLogout = useCallback(() => {
        signOut(getAuth()).catch((error) => {
            dispatch(openSnackbar(error.message));
        });
    }, []);
    useEffect(() => {
        initializeApp(config.get('firebaseConfig'));
        provider.current = new GoogleAuthProvider(getAuth());
        onAuthStateChanged(getAuth(), (user) => {
            dispatch(setCurrentUser(user));
        });
    }, []);
    const closeAllMenus = () => {
        setAccountAnchorEl(null);
    };
    const EndMenuItem = useCallback((prps) => {
        const { onClick, children } = prps;
        const cpProps = { ...prps };
        delete cpProps.onClick;
        return (
            <MenuItem
                onClick={() => {
                    closeAllMenus();
                    if (onClick) onClick();
                    return true;
                }}
                {...cpProps}
            >
                {children}
            </MenuItem>
        );
    }, []);
    return (
        <AppBar position="static" enableColorOnDark {...props} ref={ref}>
            <Toolbar>
                <IconButton
                    onClick={() => dispatch(openToolBox(!toolBoxOpened))}
                    size="large"
                    edge="start"
                    color="inherit"
                    aria-label="tool box"
                    sx={{ mr: 2 }}
                    disabled={overlay}
                >
                    <MenuIcon />
                </IconButton>
                <Typography variant="h5" component="a" color="inherit" sx={{ flex: 1, cursor: 'pointer' }} onClick={() => { window.location.href = '/'; }}>Walklog</Typography>
                <IconButton onClick={accountMenuOpenCB} color="inherit" size="large">
                    { currentUser ? <img alt="user profile" style={{ width: 24, borderRadius: '50%' }} src={currentUser.photoURL} /> : <AccountCircleIcon /> }
                </IconButton>
                <Button component="a" href="https://github.com/ssugiyama/walklog" target="_blank" color="inherit" sx={{ textTransform: 'none' }}>{appVersion}</Button>
            </Toolbar>
            <Menu
                anchorEl={accountAnchorEl}
                open={Boolean(accountAnchorEl)}
                onClose={accountMenuCloseCB}
            >
                {
                    currentUser ? [
                        (
                            <MenuItem key="label" disabled>
                                Logged in as
                                {currentUser.displayName}
                            </MenuItem>
                        ),
                        (<Divider key="divider" />),
                        (<EndMenuItem key="new walk" onClick={handleNewWalk} disabled={selectedPath === null}>new walk...</EndMenuItem>),
                        (<EndMenuItem key="logout" onClick={handleLogout}>logout</EndMenuItem>),
                    ] : [<EndMenuItem key="login" onClick={handleLogin}>login with Google</EndMenuItem>]
                }
            </Menu>
        </AppBar>
    );
};

export default forwardRef(NavBar);
