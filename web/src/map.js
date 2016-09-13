import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import { setSearchForm, setSelectedPath, setCenter, setStreetView } from './actions'
import { connect } from 'react-redux';
import styles from './styles';
import SideBoxContainer from './side-box';

const PathManager = typeof window !== 'undefined' ? require('./path-manager').default : {};

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
				fetch('/api/cities?' + params)
				.then(response => response.json())
				.then(json => this.addCity(json[0].jcode, json[0].the_geom))
				.catch(ex => alert(ex))
            }
        });
        google.maps.event.addListener(this.map, 'center_changed', () => {
	    	this.props.setCenter(this.map.getCenter());		
		});
		this.path_manager = new PathManager({map: this.map});
		let path_changed = () => {
		    let next_path = this.path_manager.getEncodedSelection();
	    	if (this.props.selected_path != next_path) {
				this.props.setSelectedPath(next_path);
	    	}
		};
        google.maps.event.addListener(this.path_manager, 'length_changed', path_changed);
        google.maps.event.addListener(this.path_manager, 'selection_changed', path_changed);

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
		window.addEventListener('resize', this.handleResize.bind(this));
		this.componentDidUpdate();
    }
    citiesChanges() {
		let a = new Set(this.props.cities.split(/,/));
		let b = new Set(Object.keys(this.cities || {}));
		if (a.length !== b.length) return true;
		for (let j of a) {
			if (!b.has(j)) return true;
		}
		return false;
    }
    handleResize() {
		setTimeout(() => {
			google.maps.event.trigger(this.map, 'resize');
		}, 500);
    }
    updatePaths(paths) {
		if (Object.keys(paths).length == 0) {
			this.path_manager.deleteAll();
		}
		else {
			for (let path in paths) {
				this.path_manager.showPath(path, false);
			}
		}
    }
    componentWillReceiveProps(nextProps) {
		this.paths_changed = (nextProps.paths != this.props.paths);
		if (nextProps.panorama != this.map.getStreetView()) {
			this.map.setStreetView(nextProps.panorama);
			if (nextProps.panorama === null) {
				this.props.setStreetView(this.map.getStreetView());
			}
		}
    }
    componentWillUpdate(nextProps, nextState) {
		if (nextProps.info_window != this.props.info_window) {
			if (nextProps.info_window.open) {
				this.infoWindow.open(this.map);
				this.infoWindow.setPosition(nextProps.info_window.position);
				this.infoWindow.setContent(nextProps.info_window.message);
			}
			else {
				this.infoWindow.close();
			}
		}
		if (nextProps.center && ! nextProps.center.equals(this.props.center)) {
			this.map.setCenter(nextProps.center);
		}
    }
    componentDidUpdate() {
		if (this.props.selected_path && this.props.selected_path != this.path_manager.getEncodedSelection()) {
			this.path_manager.showPath(this.props.selected_path, true);
		}
		else if (! this.props.selected_path) {
			this.path_manager.deletePath();
		}
		if (this.paths_changed) {
			this.updatePaths(this.props.paths);
		}
		if (this.props.editing_path) {
			this.path_manager.set('editable', true)
		}
		if (this.props.filter == 'neighborhood') {
			this.distanceWidget.setMap(this.map);
			this.distanceWidget.set('radius', parseFloat(this.props.radius));
			let center = new google.maps.LatLng(this.props.latitude, this.props.longitude);
			this.distanceWidget.setCenter(center);
		}
		else {
			this.distanceWidget.setMap(null);
		}
		if (this.props.filter == 'cities' && this.citiesChanges()) {
			if (this.cities) {
				for (let id of Object.keys(this.cities)) {
					let pg = this.cities[id];
					pg.setMap(null);
				}
			}
			this.cities = {};
			if (this.props.cities) {
			fetch('/api/cities?jcodes=' + this.props.cities)
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
			<div ref="map" style={styles.map}></div>
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
	selected_path: state.main.selected_path,
	editing_path: state.main.editing_path,
	paths: state.main.paths,
	panorama: state.main.panorama,
	info_window: state.main.info_window,
	center: state.main.center,
    }
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({setSearchForm, setSelectedPath, setCenter, setStreetView}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Map);
