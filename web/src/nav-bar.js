import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { toggleView, openWalkEditor, openGeocodeModal, setCenter, setEditingPath, deleteSelectedPath, clearPaths, downloadPath, uploadPath } from './actions';
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

class NavBar extends Component {
    constructor(props) {
        super(props);
        this.state = { topAnchorEl: null, pathAnchorEl: null, geoAnchorEl: null };
    }
    setCurrentPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition( pos => {
                const center = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                this.props.setCenter(center);
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
        return event => this.setState({ [anchorEl]: event.currentTarget });
    }
    handleMenuClose(anchorEl) {
        return event => this.setState({ [anchorEl]: null });
    }
    handleLogin() {
        window.location.href = '/auth/twitter?redirect=' + window.location.href;
    }
    handleLogout() {
        window.location.href = '/auth/logout?redirect=' + window.location.href;
    }
    closeAllMenus() {
        this.setState({ topAnchorEl: null, pathAnchorEl: null, geoAnchorEl: null, accountAnchorEl: null });
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
                <Toolbar>
                    <IconButton onClick={this.handleMenuOpen('topAnchorEl')} color="inherit"><MenuIcon /></IconButton>
                    <Typography variant="headline" color="inherit" className={classes.title}>Walklog</Typography>
                    <IconButton onClick={this.handleMenuOpen('accountAnchorEl')} color="inherit">
                        { current_user ? <img className={classes.userPhoto} src={current_user.photo} /> : <AccountCircleIcon /> }
                    </IconButton>
                    <IconButton onClick={this.handleShow.bind(this)} color="inherit"><VisibilityIcon /></IconButton>
                    <Menu
                        anchorEl={this.state.topAnchorEl}
                        open={Boolean(this.state.topAnchorEl)}
                        onClose={this.handleMenuClose('topAnchorEl')}
                    >
                        <ParentMenuItem key="path" subMenuAnchor="pathAnchorEl">path</ParentMenuItem>
                        <ParentMenuItem key="geo" subMenuAnchor="geoAnchorEl">geo</ParentMenuItem>
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
                                (<Divider />),
                                (<EndMenuItem key="new walk" onClick={this.handleNewWalk.bind(this)} disabled={this.props.selected_path == null}>new walk...</EndMenuItem>),
                                (<EndMenuItem key="logout" onClick={this.handleLogout.bind(this)}>logout</EndMenuItem>)
                            ] : [<EndMenuItem key="login" onClick={this.handleLogin.bind(this)}>login with twitter</EndMenuItem>]
                        }                        
                    </Menu>
                    <Menu
                        anchorEl={this.state.pathAnchorEl}
                        open={Boolean(this.state.pathAnchorEl)}
                        onClose={this.handleMenuClose('pathAnchorEl')}
                    >
                        <EndMenuItem key="edit" onClick={() => this.props.setEditingPath() } disabled={! selected_path}>edit</EndMenuItem>,
                        <EndMenuItem key="delete" onClick={() => this.props.deleteSelectedPath() }  disabled={! selected_path}>delete</EndMenuItem>,
                        <EndMenuItem key="clear" onClick={() => this.props.clearPaths() }>clear</EndMenuItem>,
                        <EndMenuItem key="download" onClick={() => this.props.downloadPath() } disabled={! selected_path}>download</EndMenuItem>,
                        <EndMenuItem key="upload" onClick={() => this.props.uploadPath() }>upload...</EndMenuItem>
                    </Menu>
                    <Menu
                        anchorEl={this.state.geoAnchorEl}
                        open={Boolean(this.state.geoAnchorEl)}
                        onClose={this.handleMenuClose('geoAnchorEl')}
                    >
                        <EndMenuItem key="geocode" onClick={ () => this.props.openGeocodeModal(true)}>geocode...</EndMenuItem>,
                        <EndMenuItem key="geolocation" onClick={this.setCurrentPosition.bind(this)}>geolocation</EndMenuItem>
                    </Menu>
                </Toolbar>
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
    return bindActionCreators({ toggleView, openWalkEditor, openGeocodeModal, setCenter,  setEditingPath, deleteSelectedPath, clearPaths, downloadPath, uploadPath }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(NavBar));
