import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
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
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Button from '@mui/material/Button';
import firebase from 'firebase/app'
import config from 'react-global-configuration';
import { push } from '@lagunovsky/redux-react-router';
import 'firebase/auth';

const NavBar = () => {
    const provider = useRef();
    const [accountAnchorEl, setAccountAnchorEl] = useState(null);
    const dispatch = useDispatch();
    const selectedPath  = useSelector(state => state.map.selectedPath);
    const currentUser   = useSelector(state => state.misc.currentUser);
    const appVersion = 'v' + config.get('appVersion');
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
    return (
        <AppBar position="static" enableColorOnDark={true} sx={{pt: 'env(safe-area-inset-top)'}}>
            <Toolbar>
                <Typography variant="h5" component="a" color="inherit" sx={{flex: 1, cursor: 'pointer'}} onClick={() => dispatch(push('/'))}>Walklog</Typography>
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
        </AppBar>
    );
};

export default NavBar;
