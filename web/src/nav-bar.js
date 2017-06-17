import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { toggleSidebar, openWalkEditor, openGeocodeModal, setCenter } from './actions';
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
                let center = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
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
                        <MenuItem primaryText="new walk..."  onTouchTap={this.handleNewWalk.bind(this)} disabled={this.props.selected_path == null}/>
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
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ toggleSidebar, openWalkEditor, openGeocodeModal, setCenter }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(NavBar);
