import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { setSearchForm, setSelectedPath, setCenter, setStreetView, removeFromActionQueue, toggleSidebar } from './actions';
import { connect } from 'react-redux';
import styles from './styles';
import SideBoxContainer from './side-box';
import * as ActionTypes from './action-types';

const PathManager = typeof window !== 'undefined' ? require('./path-manager').default : {};

class Map extends Component {
    componentDidMount() {
        const defaultPos = new google.maps.LatLng(this.props.latitude, this.props.longitude);
        const options = {
            zoom: 13,
            center: defaultPos,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            disableDoubleClickZoom: true,
            scaleControl: true,
            scrollwheel : false,
            streetViewControl: true,
            mapTypeControlOptions: {
                position: google.maps.ControlPosition.TOP_RIGHT,
                mapTypeIds: [ google.maps.MapTypeId.ROADMAP, 
                    google.maps.MapTypeId.SATELLITE, 
                    google.maps.MapTypeId.TERRAIN, 
                    'gsi' ],
                style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
            }
        };

        this.map = new google.maps.Map(this.refs.map, options);
        google.maps.event.addListener(this.map, 'click', event => {
            if (this.props.filter == 'neighborhood'){
                this.distanceWidget.setCenter(event.latLng);
            }
            else if (this.props.filter == 'cities') {
                const params = `latitude=${event.latLng.lat()}&longitude=${event.latLng.lng()}`;
                fetch('/api/cities?' + params)
                    .then(response => response.json())
                    .then(json => this.addCity(json[0].jcode))
                    .catch(ex => alert(ex));
            }
        });
        google.maps.event.addListener(this.map, 'center_changed', () => {
            this.props.setCenter(this.map.getCenter());
        });
        this.path_manager = new PathManager({map: this.map});
        const path_changed = () => {
            const next_path = this.path_manager.getEncodedSelection();
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
        this.map.mapTypes.set('gsi', this.gsiMapOption());
        const gsiLogo = document.createElement('div');
        gsiLogo.innerHTML = '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" >地理院タイル</a>';
        gsiLogo.style.display = 'none';
        google.maps.event.addListener( this.map, 'maptypeid_changed', () => {
            const currentMapTypeID = this.map.getMapTypeId();
            if ( currentMapTypeID == 'gsi' ) {
                gsiLogo.style.display = 'inline';
            } else {
                gsiLogo.style.display = 'none';
            }
        });
        this.map.controls[ google.maps.ControlPosition.BOTTOM_RIGHT ].push(gsiLogo);
        this.infoWindow = new google.maps.InfoWindow();
        window.addEventListener('resize', this.handleResize.bind(this));
        this.componentDidUpdate();
    }
    citiesChanges() {
        const a = new Set(this.props.cities.split(/,/));
        const b = new Set(Object.keys(this.cities || {}));
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
    processActionQueue() {
        const len = this.props.action_queue.length;
        if (len == 0) return;
        const action = this.props.action_queue[len-1];
        if (action.type == ActionTypes.ADD_PATHS) {
            for (let path of action.paths) {
                this.path_manager.showPath(path, false, false);
            }
            this.props.removeFromActionQueue();
        }
        else if (action.type == ActionTypes.CLEAR_PATHS) {
            this.path_manager.deleteAll();
            this.props.removeFromActionQueue();
        }
    }
    componentDidUpdate() {
        if (this.props.selected_path && this.props.selected_path != this.path_manager.getEncodedSelection()) {
            this.path_manager.showPath(this.props.selected_path, true);
        }
        else if (! this.props.selected_path) {
            this.path_manager.deletePath();
        }
        if (this.props.highlighted_path && this.props.highlighted_path != this.path_manager.getEncodedHighlight()) {
            this.path_manager.showPath(this.props.highlighted_path, false, true);
        }
        this.processActionQueue();
        if (this.props.editing_path) {
            this.path_manager.set('editable', true);
        }
        if (this.props.filter == 'neighborhood') {
            this.distanceWidget.setMap(this.map);
            this.distanceWidget.set('radius', parseFloat(this.props.radius));
            const center = new google.maps.LatLng(this.props.latitude, this.props.longitude);
            this.distanceWidget.setCenter(center);
        }
        else {
            this.distanceWidget.setMap(null);
        }
        if (this.props.filter == 'cities' && this.citiesChanges() && ! this.fetchingCities) {
            if (this.cities) {
                for (let id of Object.keys(this.cities)) {
                    const pg = this.cities[id];
                    pg.setMap(null);
                }
            }
            this.cities = {};
            if (this.props.cities) {
                this.fetchingCities = true;
                fetch('/api/cities?jcodes=' + this.props.cities)
                    .then(response => response.json())
                    .then(cities => {
                        cities.forEach(city => {
                            const pg = this.toPolygon(city.jcode, city.the_geom);
                            pg.setMap(this.map);
                        });
                    })
                    .catch(ex => {
                        alert(ex);
                    })
                    .then(() => {
                        this.fetchingCities = false;
                    });
            }
        }
        if (this.cities) {
            for (let id of Object.keys(this.cities)) {
                const geom = this.cities[id];
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
        const paths = str.split(' ').map(element => google.maps.geometry.encoding.decodePath(element));
        const pg =  new google.maps.Polygon({});
        pg.setPaths(paths);
        pg.setOptions(this.areaStyle);
        this.cities[id] = pg;
        google.maps.event.addListener(pg, 'click',  event => {
            this.removeCity(id, pg);
        });
        return pg;
    }
    addCity(id) {
        if (this.cities === undefined) this.cities = {};
        if (this.cities[id]) return;
        const cities = this.props.cities.split(/,/).filter(elm => elm).concat(id).join(',');
        this.props.setSearchForm({cities});
    }
    removeCity(id, pg) {
        const cities = this.props.cities.split(/,/);
        const index = cities.indexOf(id);
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
        );
    }
    gsiMapOption() {
        const tileType = 'std';
        const tileExtension = 'png';
        const zoomMax = 18;
        const zoomMin = 5;        
        return {
            name: '地理院地図',
            tileSize: new google.maps.Size(256, 256),
            minZoom: zoomMin,
            maxZoom: zoomMax,
            getTile: (tileCoord, zoom, ownerDocument) => {
                const img = ownerDocument.createElement("img");
                img.id = 'gsi-map-layer-image';
                img.style.width = '256px';
                img.style.height = '256px';
                const x = (tileCoord.x % Math.pow(2, zoom)).toString();
                const y = tileCoord.y.toString();
                img.src = `http://cyberjapandata.gsi.go.jp/xyz/${tileType}/${zoom}/${x}/${y}.${tileExtension}`;
                return img;
            }
        }
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
        highlighted_path: state.main.highlighted_path,
        editing_path: state.main.editing_path,
        action_queue: state.main.action_queue,
        panorama: state.main.panorama,
        info_window: state.main.info_window,
        center: state.main.center,
        open_sidebar: state.main.open_sidebar,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({setSearchForm, setSelectedPath, setCenter, setStreetView, removeFromActionQueue, toggleSidebar}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Map);
