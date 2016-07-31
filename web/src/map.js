import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import { setPathManagerAction, setSearchForm, setSelectedPath, setComponentProcs } from './actions'
import { connect } from 'react-redux';

const PathManager = require('./path-manager.js');

class Map extends Component {
    componentDidMount() {
        let defaultPos = new google.maps.LatLng(this.props.latitude, this.props.longitude);
        let options = {
            zoom: 13,
            center: defaultPos,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            disableDoubleClickZoom: true,
            scaleControl: true,
            scrollwheel : false,
            streetViewControl: true
        };

        this.map = new google.maps.Map(this.refs.map, options);
        google.maps.event.addListener(this.map, 'click', event => {
            if(this.props.filter == 'neighborhood'){
                this.distanceWidget.setCenter(event.latLng);
            }
            else if(this.props.filter == 'cities') {
		let params = `latitude=${event.latLng.lat()}&longitude=${event.latLng.lng()}`
		fetch('/cities?' + params)
		    .then(response => response.json())
		    .then(json => this.addCity(json[0].jcode, json[0].the_geom))
		    .catch(ex => alert(ex))
            }
        });	
	this.path_manager = new PathManager({map: this.map});	
	this.props.setPathManagerAction(this.path_manager);
	this.props.setSelectedPath(this.path_manager.getSelection());
        google.maps.event.addListener(this.path_manager, 'length_changed', () => {
	    this.props.setSelectedPath(this.path_manager.getSelection());	
	});
        google.maps.event.addListener(this.path_manager, 'selection_changed', () => {
	    this.props.setSelectedPath(this.path_manager.getSelection());
	});
	
        this.distanceWidget = new google.maps.Circle({
            strokeWeight: 2,
            editable: true,
            color: '#000',
            center: defaultPos,
            radius: parseFloat(this.props.radius),
        });
	google.maps.event.addListener(this.distanceWidget, 'center_changed', () => {
	    this.props.setSearchForm({
		latitude: this.distanceWidget.getCenter().lat(),
		longitude: this.distanceWidget.getCenter().lng()
	    });
	});
	google.maps.event.addListener(this.distanceWidget, 'radius_changed', () => {
	    this.props.setSearchForm({
		radius: this.distanceWidget.getRadius()
	    });
	});

	this.infoWindow = new google.maps.InfoWindow();
	let showInfoWindow = (info, position) => {
            this.infoWindow.open(this.map);
            this.infoWindow.setPosition(position);
            this.infoWindow.setContent(info);
	};
	let hideInfoWindow = () => {
	    this.infoWindow.close();
	};
	let setStreetView = panorama => {
	    this.map.setStreetView(panorama);
	};
	let setCenter = pt => {
	    this.map.setCenter(pt);
	}
	let setCurrentPosition = () => {
	    if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition( pos => {
		    let center = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
		    this.map.setCenter(center);
		}, () => {
		    alert("Unable to retrieve your location");
		});
	    }
	    else {
		alert("Geolocation is not supported by your browser");
	    }
	}
	let resizeMap = () => {
	    google.maps.event.trigger(this.map, 'resize');
	};
	let resetCities = () => {
            Object.keys(this.cities).forEach(id => {
                this.cities[id].setMap(null);
            });
            this.cities = {};
	    this.props.setSearchForm('cities', '');	    
	};
	this.props.setComponentProcs({showInfoWindow, hideInfoWindow, setStreetView, setCenter, setCurrentPosition, resizeMap});
	this.updateWidgets();
	window.addEventListener('resize', this.handleResize.bind(this));	
    }
    updateWidgets() {
	if (this.props.filter == 'neighborhood') {
	    this.distanceWidget.setMap(this.map);
	    this.distanceWidget.set('radius', parseFloat(this.props.radius));
	    let center = new google.maps.LatLng(this.props.latitude, this.props.longitude);
	    this.distanceWidget.setCenter(center);
	}
	else {
	    this.distanceWidget.setMap(null);
	}
	if (this.props.filter == 'cities') {
	    if (this.cities) {
		for (let id of Object.keys(this.cities)) {
		    let pg = this.cities[id];
		    pg.setMap(null);
		}
	    }
	    this.cities = {};
	    if (this.props.cities) {
		fetch('/cities?jcodes=' + this.props.cities)
		    .then(response => response.json())
		    .then(cities => {
			cities.forEach(city => {
			    let pg = this.toPolygon(city.jcode, city.the_geom);
			    pg.setMap(this.map);
			})
		    })
		    .catch(ex => alert(ex))
	    }
	}
	if (this.cities) {
	    for (let id of Object.keys(this.cities)) {
		let geom = this.cities[id];
		if (this.props.filter == 'cities') {
		    geom.setMap(this.map);
		}
		else {
		    geom.setMap(null);
		}
	    }
	}
	this.handleResize();	
    }
    handleResize() {
	setTimeout(() => {
	    google.maps.event.trigger(this.map, 'resize');
	}, 500);	
    }
    componentDidUpdate() {
	this.updateWidgets();
    }
    toPolygon(id, str) {
        let paths = str.split(" ").map(element => google.maps.geometry.encoding.decodePath(element));
        let pg =  new google.maps.Polygon({});
        pg.setPaths(paths);
        pg.setOptions(this.areaStyle);
        this.cities[id] = pg;
        google.maps.event.addListener(pg, 'click',  this.removeCity.bind(this, id, pg));	
	return pg;
    }
    addCity(id, str) {
	if (this.cities === undefined) this.cities = {};
        if (this.cities[id]) return;
	let cities = this.props.cities.split(/,/).filter(elm => elm).concat(id).join(',');
	this.props.setSearchForm({cities});
    }
    removeCity(id, pg) {
	let cities = this.props.cities.split(/,/);
	let index = cities.indexOf(id);
	if (index >= 0){
	    cities.splice(index, 1);
	    this.props.setSearchForm({'cities': cities.join(',')});
	}
        pg.setMap(null);
        pg = null;
        delete this.cities[id];
    }
    render() {   
	return (
	    <div ref="map" className="map"></div>
	)
    }
}

function mapStateToProps(state) {
    return {
	filter: state.main.search_form.filter,
	latitude: state.main.search_form.latitude,
	longitude: state.main.search_form.longitude,
	radius: state.main.search_form.radius,
	cities: state.main.search_form.cities,
	additional_view: state.main.additional_view,
    }
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({setPathManagerAction, setSearchForm, setSelectedPath, setComponentProcs}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Map);
