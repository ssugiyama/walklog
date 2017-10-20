import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { toggleSidebar, openWalkEditor, openGeocodeModal, setCenter, setEditingPath, deleteSelectedPath, clearPaths, downloadPath, uploadPath } from './actions';
import AppBar from 'material-ui/AppBar';
import IconButton from 'material-ui/IconButton';
import IconMenu from 'material-ui/IconMenu';
import MenuItem from 'material-ui/MenuItem';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';
import ArrowDropRight from 'material-ui/svg-icons/navigation-arrow-drop-right';

class NavBar extends Component {
    constructor(props) {
        super(props);
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
        this.props.openWalkEditor(true, 'create');
    }
    handleShow() {
        this.props.toggleSidebar();
    }
    login_or_logout() {
        const url = this.props.current_user ? '/auth/logout' : '/auth/twitter';
        window.location.href = url;
    }
    render() {
        return (
            <AppBar
                title="walklog"
                onTitleTouchTap={this.handleShow.bind(this)}
                onLeftIconButtonClick={this.handleShow.bind(this)}
                iconElementRight={
                    <IconMenu
                        iconButtonElement={
                            <IconButton><MoreVertIcon /></IconButton>
                    }>
                        <MenuItem primaryText={this.props.current_user ? 'logout' : 'login with twitter'}  onClick={this.login_or_logout.bind(this)} />
                        {
                            this.props.current_user ? ( <MenuItem primaryText="new walk..."  onClick={this.handleNewWalk.bind(this)} disabled={this.props.selected_path == null}/>): null
                        }
                        <MenuItem primaryText="path" rightIcon={<ArrowDropRight />}
                            menuItems={[
                                <MenuItem primaryText="edit" onClick={() => this.props.setEditingPath() } disabled={! this.props.selected_path} />,
                                <MenuItem primaryText="delete" onClick={() => this.props.deleteSelectedPath() }  disabled={! this.props.selected_path} />,
                                <MenuItem primaryText="clear" onClick={() => this.props.clearPaths() } />,
                                <MenuItem primaryText="download" onClick={() => this.props.downloadPath()} disabled={! this.props.selected_path} />,
                                <MenuItem primaryText="upload..." onClick={() => this.props.uploadPath()} />,
                            ]}
                        />
                        <MenuItem primaryText="geo" rightIcon={<ArrowDropRight />}
                            menuItems={[
                                <MenuItem onClick={ () => this.props.openGeocodeModal(true)} primaryText="geocode..." />,
                                <MenuItem onClick={this.setCurrentPosition.bind(this)} primaryText="geolocation" />
                            ]}
                        />
                     </IconMenu>
                 }
            />
        );
    }
}

function mapStateToProps(state) {
    return {
        selected_path: state.main.selected_path,
        current_user: state.main.current_user,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ toggleSidebar, openWalkEditor, openGeocodeModal, setCenter,  setEditingPath, deleteSelectedPath, clearPaths, downloadPath, uploadPath }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(NavBar);
