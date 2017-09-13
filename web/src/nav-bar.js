import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { toggleSidebar, openWalkEditor, openGeocodeModal, setCenter, setEditingPath, deleteSelectedPath, clearPaths,  openIOModal, setAdmin } from './actions';
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
        const url = this.props.admin ? '/auth/logout' : '/auth/twitter';
        window.location.href = url;
    }
    render() {
        return (
            <AppBar
                title="walklog"
                onTitleTouchTap={this.handleShow.bind(this)}
                onLeftIconButtonTouchTap={this.handleShow.bind(this)}
                iconElementRight={
                    <IconMenu
                        iconButtonElement={
                            <IconButton><MoreVertIcon /></IconButton>
                    }>
                        <MenuItem primaryText={this.props.admin ? 'logout' : 'login with twitter'}  onTouchTap={this.login_or_logout.bind(this)} />
                        {
                            this.props.admin ? ( <MenuItem primaryText="new walk..."  onTouchTap={this.handleNewWalk.bind(this)} disabled={this.props.selected_path == null}/>): null
                        }
                        <MenuItem primaryText="path" rightIcon={<ArrowDropRight />}
                            menuItems={[
                                <MenuItem primaryText="edit" onTouchTap={() => this.props.setEditingPath() } disabled={! this.props.selected_path} />,
                                <MenuItem primaryText="delete" onTouchTap={() => this.props.deleteSelectedPath() }  disabled={! this.props.selected_path} />,
                                <MenuItem primaryText="clear" onTouchTap={() => this.props.clearPaths() } />,
                                <MenuItem primaryText="export/import..." onTouchTap={() => this.props.openIOModal(true)} />,
                            ]}
                        />
                        <MenuItem primaryText="geo" rightIcon={<ArrowDropRight />}
                            menuItems={[
                                <MenuItem onTouchTap={ () => this.props.openGeocodeModal(true)} primaryText="geocode..." />,
                                <MenuItem onTouchTap={this.setCurrentPosition.bind(this)} primaryText="geolocation" />
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
        admin: state.main.admin,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ toggleSidebar, openWalkEditor, openGeocodeModal, setCenter,  setEditingPath, deleteSelectedPath, clearPaths,  openIOModal, setAdmin }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(NavBar);
