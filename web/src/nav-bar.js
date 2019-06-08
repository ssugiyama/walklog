import React, { useContext, useEffect, useState, memo } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
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
import { withStyles } from '@material-ui/core/styles';
import ConfirmModal from './confirm-modal';
import {APPEND_PATH_CONFIRM_INFO} from './constants';
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

const AUTO_GEOLOCATION_INTERVAL = 30000;

const NavBar = (props) => {
    const [topAnchorEl, setTopAnchorEl] = useState(null);
    const [accountAnchorEl, setAccountAnchorEl] = useState(null);
    const [autoGeolocation, setAutoGeolocation] = useState(false);
    const [confirmInfo, setConfirmInfo] = useState({open: false});
    const context = useContext(MapContext);
    const { addPoint } = context.state;
    const { openWalkEditor, setGeoMarker, openSnackbar } = props;
    const {  selectedPath, currentUser  } = props;
    const addCurrentPosition = (pos, append) => {
        setConfirmInfo({open: false});
        const geoMarker = { lat: pos.coords.latitude, lng: pos.coords.longitude, show: true };
        setGeoMarker(geoMarker, !append);
        addPoint(pos.coords.latitude, pos.coords.longitude, append);
    };
    const getCurrentPosition = (onSuccess, onFailure) => {
        navigator.geolocation.getCurrentPosition( pos => {
            onSuccess(pos);    
        }, () => {
            if (onFailure) onFailure();
        });
    };
    const handleNewWalk = () => {
        openWalkEditor(true, 'create');
    };
    const handleMenuOpen = (setter) => {
        return event => {
            event.stopPropagation();
            setter(event.currentTarget);
        };
    };
    const handleMenuClose = (setter) => {
        return event => { 
            event.stopPropagation();
            setter(null);
        };
    };
    const handleLogin = () => {
        window.location.href = '/auth/twitter?redirect=' + window.location.href;
    };
    const handleLogout = () => {
        window.location.href = '/auth/logout?redirect=' + window.location.href;
    };
    const ignoreClick = () => {
        return event => {
            event.stopPropagation();
            return false;
        };
    };
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
    const handleAutoGeolocationChange = (event, value) => {
        if (value && navigator.geolocation) {
            getCurrentPosition(pos => {
                setAutoGeolocation(true);
                openSnackbar('start following your location');
                new Promise((resolve) => {
                    if (selectedPath) {
                        setConfirmInfo({open: true, resolve});
                    }
                    else {
                        resolve(false);
                    }
                }).then(append => addCurrentPosition(pos, append));
            }, () => {
                alert('Unable to retrieve your location');
            });
        } else if (value) {
            alert('Geolocation is not supported by your browser');
        } else {
            setAutoGeolocation(false);
            openSnackbar('stop following your location');
        }
    };
    const closeAllMenus = () => {
        setTopAnchorEl(null);
        setAccountAnchorEl(null);
    };
    const { classes } = props;
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
                <IconButton onClick={handleMenuOpen(setTopAnchorEl)} color="inherit"><MenuIcon /></IconButton>
                <Typography variant="h5" color="inherit" className={classes.title}>Walklog</Typography>
                <Checkbox
                    icon={<MyLocationIcon />}
                    checkedIcon={<MyLocationIcon />}
                    checked={autoGeolocation}
                    onChange={handleAutoGeolocationChange}
                    onClick={ignoreClick()}
                    value="autoGeolocation"
                />
                <IconButton onClick={handleMenuOpen(setAccountAnchorEl)} color="inherit">
                    { currentUser ? <img className={classes.userPhoto} src={currentUser.photo} /> : <AccountCircleIcon /> }
                </IconButton>
            </Toolbar>
            <Menu
                anchorEl={topAnchorEl}
                open={Boolean(topAnchorEl)}
                onClose={handleMenuClose(setTopAnchorEl)}
            >
                {
                    props.externalLinks.map(link => 
                        <EndMenuItem component="a" href={link[1]} target="_blank" key={link[0]} >{link[0]}</EndMenuItem>
                    )
                }
            </Menu>
            <Menu
                anchorEl={accountAnchorEl}
                open={Boolean(accountAnchorEl)}
                onClose={handleMenuClose(setAccountAnchorEl)}
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

function mapStateToProps(state) {
    return {
        selectedPath: state.main.selectedPath,
        currentUser: state.main.currentUser,
        externalLinks: state.main.externalLinks,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ openWalkEditor, setGeoMarker, openSnackbar}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(memo(NavBar)));
