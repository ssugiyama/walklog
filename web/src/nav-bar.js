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
import MoreVertIcon from '@material-ui/icons/MoreVert';
import MenuIcon from '@material-ui/icons/Menu';
import { withStyles } from '@material-ui/core/styles';

const styles = {
    root: {
        paddingTop: 'env(safe-area-inset-top)',
    },
    title: {
        flex: 1,
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
                const center = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
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
        this.closeAllMenus();
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
    login_or_logout() {
        this.closeAllMenus();
        const url = this.props.current_user ? '/auth/logout' : '/auth/twitter';
        window.location.href = url + '?redirect=' + window.location.href;
    }
    closeAllMenus() {
        this.setState({ topAnchorEl: null, pathAnchorEl: null, geoAnchorEl: null });
    }
    render() {
        const classes = this.props.classes;
        return (
            <AppBar position="static" className={classes.root}>
                <Toolbar>
                    <IconButton onClick={this.handleShow.bind(this)} color="inherit"><MenuIcon /></IconButton>
                    <Typography variant="headline" color="inherit" className={classes.title}>Walklog</Typography>
                    <IconButton onClick={this.handleMenuOpen('topAnchorEl')} color="inherit"><MoreVertIcon /></IconButton>
                    <Menu 
                        anchorEl={this.state.topAnchorEl}
                        open={Boolean(this.state.topAnchorEl)}
                        onClose={this.handleMenuClose('topAnchorEl')}
                    >
                        <MenuItem key="login or logout" onClick={this.login_or_logout.bind(this)}>{this.props.current_user ? 'logout' : 'login with twitter'}</MenuItem>
                        {
                            this.props.current_user && ( <MenuItem key="new walk" onClick={this.handleNewWalk.bind(this)} disabled={this.props.selected_path == null}>new walk...</MenuItem>)
                        }
                        <MenuItem key="path" onClick={this.handleMenuOpen('pathAnchorEl')}>path ▶</MenuItem> 
                            
                        <MenuItem onClick={this.handleMenuOpen('geoAnchorEl')}>geo ▶</MenuItem>
                            
                        <Divider />
                        {
                            this.props.external_links.map(link => 
                                <MenuItem component="a" href={link.href} target="_blank" key={link.name} >{link.name}</MenuItem>
                            )
                        }
                    </Menu>
                    <Menu
                        anchorEl={this.state.pathAnchorEl}
                        open={Boolean(this.state.pathAnchorEl)}
                        onClose={this.handleMenuClose('pathAnchorEl')}
                    >
                        <MenuItem key="edit" onClick={() => this.props.setEditingPath() } disabled={! this.props.selected_path}>edit</MenuItem>,
                        <MenuItem key="delete" onClick={() => this.props.deleteSelectedPath() }  disabled={! this.props.selected_path}>delete</MenuItem>,
                        <MenuItem key="clear" onClick={() => this.props.clearPaths() }>clear</MenuItem>,
                        <MenuItem key="download" onClick={() => this.props.downloadPath()} disabled={! this.props.selected_path}>download</MenuItem>,
                        <MenuItem key="upload" onClick={() => {this.closeAllMenus(); this.props.uploadPath();}}>upload...</MenuItem>
                    </Menu>
                    <Menu
                        anchorEl={this.state.geoAAnchorEl}
                        open={Boolean(this.state.geoAnchorEl)}
                        onClose={this.handleMenuClose('geoAnchorEl')}
                    >
                        <MenuItem key="geocode" onClick={ () => {this.closeAllMenus(); this.props.openGeocodeModal(true); }}>geocode...</MenuItem>,
                        <MenuItem key="geolocation" onClick={this.setCurrentPosition.bind(this)}>geolocation</MenuItem>
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
