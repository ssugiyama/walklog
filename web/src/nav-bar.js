import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {
    toggleView,
    openWalkEditor,
    openGeocodeModal,
    setGeoMarker,
    setEditingPath,
    deleteSelectedPath,
    clearPaths,
    downloadPath,
    uploadPath,
    setMessage,
    openSnackbar,
} from './actions';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Divider from '@material-ui/core/Divider';
import Typography from '@material-ui/core/Typography';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import VisibilityIcon from '@material-ui/icons/Visibility';
import ArrowDownIcon from '@material-ui/icons/ArrowDropDown';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import MenuIcon from '@material-ui/icons/Menu';
import Checkbox from '@material-ui/core/Checkbox';
import MyLocationIcon from '@material-ui/icons/MyLocation';
import { withStyles } from '@material-ui/core/styles';

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

class NavBar extends Component {
    constructor(props) {
        super(props);
        this.autoGeolocationIntervalID = null;
        this.state = { topAnchorEl: null, autoGeolocation: false };
    }
    setCurrentPosition(updateCenter) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition( pos => {
                const geo_marker = { lat: pos.coords.latitude, lng: pos.coords.longitude, show: true };
                this.props.setGeoMarker(geo_marker, updateCenter);
            }, () => {
                alert('Unable to retrieve your location');
            });
        }
        else {
            alert('Geolocation is not supported by your browser');
        }
    }
    handleNewWalk() {
        this.props.openWalkEditor(true, 'create');
    }
    handleShow() {
        this.props.toggleView();
    }
    handleMenuOpen(anchorEl) {
        return event => {
            event.stopPropagation();
            this.setState({ [anchorEl]: event.currentTarget });
        };
    }
    handleMenuClose(anchorEl) {
        return event => { 
            event.stopPropagation();
            this.setState({ [anchorEl]: null });
        };
    }
    handleLogin() {
        window.location.href = '/auth/twitter?redirect=' + window.location.href;
    }
    handleLogout() {
        window.location.href = '/auth/logout?redirect=' + window.location.href;
    }
    ignoreClick() {
        return event => {
            event.stopPropagation();
            return false;
        };
    } 
    handleAutoGeolocationChange() {
        return (event, value) => {
            this.setState({ autoGeolocation: value});
            if (value && !this.autoGeolocationIntervalID) {
                this.setCurrentPosition(true);
                this.autoGeolocationIntervalID = setInterval(() => {
                    this.setCurrentPosition(false);
                }, AUTO_GEOLOCATION_INTERVAL);
                this.props.setMessage('Start following your location');
                this.props.openSnackbar(true);
            } else if (!value && this.autoGeolocationIntervalID) {
                clearInterval(this.autoGeolocationIntervalID);
                this.autoGeolocationIntervalID = null;
                this.props.setMessage('Stop following your location');
                this.props.openSnackbar(true);
            }
        };
    }
    closeAllMenus() {
        this.setState({ topAnchorEl: null, accountAnchorEl: null });
    }
    render() {
        const { classes, current_user, selected_path } = this.props;
        const EndMenuItem = props => {
            const onClick = props.onClick;
            const cpProps = Object.assign({}, props);
            delete cpProps.onClick;
            return <MenuItem onClick={() => {
                this.closeAllMenus();
                if (onClick) onClick();
                return true;
            }} {...cpProps}>{props.children}</MenuItem> ;
        };
        const ParentMenuItem = props => {
            const subMenuAnchor = props.subMenuAnchor;
            return <MenuItem key="path" onClick={this.handleMenuOpen(subMenuAnchor)}>
                <ListItemText>{props.children}</ListItemText>
                <ListItemIcon>
                    <ArrowDownIcon />
                </ListItemIcon>
            </MenuItem>;
        } ;
        return (
            <AppBar position="static" className={classes.root}>
                <Toolbar onClick={ this.handleShow.bind(this) }>
                    <IconButton onClick={this.handleMenuOpen('topAnchorEl')} color="inherit"><MenuIcon /></IconButton>
                    <Typography variant="h5" color="inherit" className={classes.title}>Walklog</Typography>
                    <Checkbox
                        icon={<MyLocationIcon />}
                        checkedIcon={<MyLocationIcon />}
                        checked={this.state.autoGeolocation}
                        onChange={this.handleAutoGeolocationChange()}
                        onClick={this.ignoreClick()}
                        value="autoGeolocation"
                    />
                    <IconButton onClick={this.handleMenuOpen('accountAnchorEl')} color="inherit">
                        { current_user ? <img className={classes.userPhoto} src={current_user.photo} /> : <AccountCircleIcon /> }
                    </IconButton>
                </Toolbar>
                <Menu
                    anchorEl={this.state.topAnchorEl}
                    open={Boolean(this.state.topAnchorEl)}
                    onClose={this.handleMenuClose('topAnchorEl')}
                >
                    <EndMenuItem key="view" onClick={ this.handleShow.bind(this) }>toggle view</EndMenuItem>
                    <Divider key="divider" />
                    {
                        this.props.external_links.map(link => 
                            <EndMenuItem component="a" href={link.href} target="_blank" key={link.name} >{link.name}</EndMenuItem>
                        )
                    }
                </Menu>
                <Menu
                    anchorEl={this.state.accountAnchorEl}
                    open={Boolean(this.state.accountAnchorEl)}
                    onClose={this.handleMenuClose('accountAnchorEl')}
                >
                    {
                        current_user ? [
                            (<MenuItem key="label" disabled={true}>Logged in as {current_user.username}</MenuItem>),
                            (<Divider key="divider" />),
                            (<EndMenuItem key="new walk" onClick={this.handleNewWalk.bind(this)} disabled={this.props.selected_path == null}>new walk...</EndMenuItem>),
                            (<EndMenuItem key="logout" onClick={this.handleLogout.bind(this)}>logout</EndMenuItem>)
                        ] : [<EndMenuItem key="login" onClick={this.handleLogin.bind(this)}>login with twitter</EndMenuItem>]
                    }                        
                </Menu>
            </AppBar>
        );
    }
}

function mapStateToProps(state) {
    return {
        selected_path: state.main.selected_path,
        current_user: state.main.current_user,
        external_links: state.main.external_links,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ toggleView, openWalkEditor, openGeocodeModal, setGeoMarker, 
        setEditingPath, deleteSelectedPath, clearPaths, downloadPath, uploadPath,
        setMessage, openSnackbar,
    }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(NavBar));
