import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { setEditingPath, setSearchForm, toggleSidebar, deleteSelectedPath, clearPaths, openWalkEditor, openIOModal, openGeocodeModal, setCenter } from './actions';
import AppBar from 'material-ui/AppBar';
import IconButton from 'material-ui/IconButton';
import IconMenu from 'material-ui/IconMenu';
import MenuItem from 'material-ui/MenuItem';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';
import ArrowDropRight from 'material-ui/svg-icons/navigation-arrow-drop-right';
import Divider from 'material-ui/Divider';

class NavBar extends Component {
    constructor(props) {
	super(props);
	this.state = {length: 0};
    }
    computeLength(selected_path) {
	if (selected_path) {
	    return google.maps.geometry.spherical.computeLength(google.maps.geometry.encoding.decodePath(selected_path))/1000;
	}
	else {
	    return 0;
	}
    }
    setCurrentPosition() {
	if (navigator.geolocation) {
	    navigator.geolocation.getCurrentPosition( pos => {
		let center = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
		this.props.setCenter(center);
	    }, () => {
		alert("Unable to retrieve your location");
	    });
	}
	else {
	    alert("Geolocation is not supported by your browser");
	}
    }

    componentWillReceiveProps(nextProps) {
        this.setState({ length:  this.computeLength(nextProps.selected_path)});
    }
    handleNewWalk() {
        this.props.openWalkEditor(true, 'create');
    }
    resetCities() {
        this.props.setSearchForm({cities: ''});
    }
    setRadius(r) {
        this.props.setSearchForm({radius: r});
    }
    handleShow() {
        this.props.toggleSidebar();
    }
    render() {
        return (
            <AppBar
                title="walklog"
                onLeftIconButtonTouchTap={this.handleShow.bind(this)}
                iconElementRight={
                    <IconMenu
                        iconButtonElement={
                            <IconButton><MoreVertIcon /></IconButton>
                    }>
                        <MenuItem primaryText="new walk..."  onTouchTap={this.handleNewWalk.bind(this)} disabled={this.props.selected_path == null}/>
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
                        { this.props.filter == 'cities' ?
                          <MenuItem onTouchTap={this.resetCities.bind(this)} primaryText="reset cities" /> : null }
                        { this.props.filter == "neighborhood" ?
                          <MenuItem primaryText="neighborhood"  rightIcon={<ArrowDropRight />}
                              menuItems={[
                                  <MenuItem onTouchTap={this.setRadius.bind(this, 1000)}  primaryText="radius: 1km" />,
                                  <MenuItem onTouchTap={this.setRadius.bind(this, 500)}  primaryText="radius: 500m" />,
                                  <MenuItem onTouchTap={this.setRadius.bind(this, 250)}  primaryText="radius: 250m" />,
                                  <MenuItem onTouchTap={this.setRadius.bind(this, 100)}  primaryText="radius: 100m" />
                           ]} /> : null }
                         <Divider />
                         <MenuItem primaryText={`Length: ${this.state.length.toFixed(1)}km`} disabled={true}/>
                     </IconMenu>
                 }
            />
        );
    }
}

function mapStateToProps(state) {
    return {
        filter: state.main.search_form.filter,
        selected_path: state.main.selected_path,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ setSearchForm, toggleSidebar, setEditingPath, deleteSelectedPath, clearPaths, openWalkEditor, openIOModal, openGeocodeModal, setCenter }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(NavBar);
