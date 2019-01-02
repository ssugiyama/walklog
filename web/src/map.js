import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { bindActionCreators } from 'redux';
import { setSearchForm, setSelectedPath, setCenter, setZoom, removeFromActionQueue, toggleView, setMap, setEditingPath, openConfirmModal } from './actions';
import { connect } from 'react-redux';
import * as ActionTypes from './action-types';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';

import config from './config';
const styles = theme => ({
    mapCompact: {
        margin: '8px 16px',
        height: '40vh',
        marginLeft: 'env(safe-area-inset-left)',
        marginRight: 'env(safe-area-inset-right)',
    },
    mapExpand: {
        flexGrow: 1,
        margin: 0,
        marginLeft: 'env(safe-area-inset-left)',
        marginRight: 'env(safe-area-inset-right)',
    }
});

const mapStyles = {
    polygon: {
        zIndex: 20,
    },
    marker: {
        zIndex: 10,
    },
    circle: {
        strokeWeight: 2,
        editable: true,
        color: '#000',
        zIndex: 20,
    },
};

function loadJS(src) {
    const ref = window.document.getElementsByTagName('script')[0];
    const script = window.document.createElement('script');
    script.src = src;
    script.async = true;
    ref.parentNode.insertBefore(script, ref);
}

class Map extends Component {
    constructor(props) {
        super(props);
        this.map_ref = React.createRef();
        this.download_ref = React.createRef();
        this.upload_ref = React.createRef();
    }
    initMap() {
        if (window.localStorage.center) {
            this.props.setCenter(JSON.parse(window.localStorage.center));
        }
        if (window.localStorage.zoom) {
            this.props.setZoom(parseInt(window.localStorage.zoom));
        }
        const options = {
            zoom: this.props.zoom,
            center: this.props.center,
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
        this.map_ref.current.addEventListener('touchmove', event => {
            event.preventDefault();
        });
        this.map = new google.maps.Map(this.map_ref.current, options);
        google.maps.event.addListener(this.map, 'click', event => {
            if (this.props.filter == 'neighborhood'){
                this.distanceWidget.setCenter(event.latLng.toJSON());
            }
            else if (this.props.filter == 'cities') {
                const params = `latitude=${event.latLng.lat()}&longitude=${event.latLng.lng()}`;
                fetch('/api/cities?' + params)
                    .then(response => response.json())
                    .then(json => this.addCity(json[0].jcode))
                    .catch(ex => alert(ex));
            }
            else {
                this.props.toggleView();
            }
        });
        google.maps.event.addListener(this.map, 'center_changed', () => {
            this.props.setCenter(this.map.getCenter().toJSON());
        });
        google.maps.event.addListener(this.map, 'zoom_changed', () => {
            this.props.setZoom(this.map.getZoom());
        });
        const PathManager = require('./path-manager').default;
        this.path_manager = new PathManager({map: this.map});
        const path_changed = () => {
            const next_path = this.path_manager.getEncodedSelection();
            if (this.props.selected_path != next_path) {
                this.props.setSelectedPath(next_path);
            }
        };
        google.maps.event.addListener(this.path_manager, 'length_changed', path_changed);
        google.maps.event.addListener(this.path_manager, 'selection_changed', path_changed);
        google.maps.event.addListener(this.path_manager, 'editable_changed',  () => {
            if (!this.path_manager.editable) {
                this.props.setEditingPath(false);
            }
        });
        google.maps.event.addListener(this.path_manager, 'polylinecomplete',  polyline => {
            new Promise((resolve, reject) => {
                if (this.props.selected_path) {
                    this.props.openConfirmModal({
                        title: 'path mode',
                        text: 'append to current path?',
                        actions: [
                            {
                                label: 'cancel',
                                value: false,
                            },
                            {
                                label: 'append',
                                value: true,
                            },
                        ],
                        resolve: resolve,
                    });
                }
                else {
                    resolve(false);
                }
            }).then(append => {
                this.path_manager.applyPath(polyline.getPath().getArray(), append);
            });
        });
        const circleOpts = Object.assign({}, mapStyles.circle, {
            center: this.props.center,
            radius: parseFloat(this.props.radius)
        });
        this.distanceWidget = new google.maps.Circle(circleOpts);
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
        this.geo_marker = new google.maps.Marker(mapStyles.marker);
        if (window.localStorage.selected_path) {
            this.props.setSelectedPath(window.localStorage.selected_path);
        }
        window.addEventListener('resize', this.handleResize.bind(this));
        this.upload_ref.current.addEventListener('change', e => {
            this.processUpload(e);
        });
        this.props.setMap(this.map);
        this.componentDidUpdate();
    }
    componentDidMount() {
        window.initMap = this.initMap.bind(this);
        loadJS('https://maps.googleapis.com/maps/api/js?&libraries=geometry,drawing&callback=initMap&key=' + config.google_api_key);
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
    componentDidUpdate(prevProps, prevState) {
        if (! this.map ) return; // componentDidUpdate can be called prior to initMap
        if (! prevProps) {
            prevProps = {};
        }
        this.paths_changed = (prevProps.paths != this.props.paths);
        if (prevProps.info_window != this.props.info_window) {
            if (this.props.info_window.open) {
                this.infoWindow.open(this.map);
                this.infoWindow.setPosition(this.props.info_window.position);
                this.infoWindow.setContent(this.props.info_window.message);
            }
            else {
                this.infoWindow.close();
            }
        }
        if (prevProps.center && this.props.center && ! ( prevProps.center.lat == this.props.center.lat && prevProps.center.lng == this.props.center.lng ) ) {
            this.map.setCenter(this.props.center);
        }
        if (prevProps.geo_marker && this.props.geo_marker && ! ( prevProps.geo_marker.lat == this.props.geo_marker.lat && prevProps.geo_marker.lng == this.props.geo_marker.lng ) ) {
            this.geo_marker.setPosition({lat: this.props.geo_marker.lat, lng: this.props.geo_marker.lng});
        }
        if (prevProps.geo_marker && this.props.geo_marker && prevProps.geo_marker.show != this.props.geo_marker.show ) {
            this.geo_marker.setMap(this.props.geo_marker.show ? this.map : null);
        }
        if (this.props.selected_path && this.props.selected_path != this.path_manager.getEncodedSelection()) {
            this.path_manager.showPath(this.props.selected_path, true);
        }
        else if (! this.props.selected_path) {
            this.path_manager.deletePath();
        }
        if (this.props.highlighted_path && this.props.highlighted_path != this.path_manager.getEncodedHighlight()) {
            this.path_manager.showPath(this.props.highlighted_path, false, true);
        }
        else if( ! this.props.highlighted_path ) {
            this.path_manager.set('highlight', null);
        }
        this.processActionQueue();
        if (this.props.editing_path) {
            this.path_manager.set('editable', true);
        }
        if (this.props.filter == 'neighborhood') {
            this.distanceWidget.setMap(this.map);
            this.distanceWidget.set('radius', parseFloat(this.props.radius));
            const center = { lat: this.props.latitude, lng: this.props.longitude };
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
        else if (action.type == ActionTypes.DOWNLOAD_PATH) {
            const content = this.path_manager.selectionAsGeoJSON();
            const blob = new Blob([ content ], { 'type' : 'application/json' });
            const elem = ReactDOM.findDOMNode(this.download_ref.current);
            elem.href = window.URL.createObjectURL(blob);
            setTimeout(() => { elem.click(); window.URL.revokeObjectURL(elem.href); }, 0);
            this.props.removeFromActionQueue();
        }
        else if (action.type == ActionTypes.UPLOAD_PATH) {
            const elem = ReactDOM.findDOMNode(this.upload_ref.current);
            setTimeout(() => elem.click(), 0);
            this.props.removeFromActionQueue();
        }
        else if (action.type == ActionTypes.ADD_POINT) {
            const pt = new google.maps.LatLng(action.lat, action.lng);
            this.path_manager.applyPath([pt], action.append);
            this.props.removeFromActionQueue();
        }
    }
    toPolygon(id, str) {
        const paths = str.split(' ').map(element => google.maps.geometry.encoding.decodePath(element));
        const pg =  new google.maps.Polygon({});
        pg.setPaths(paths);
        pg.setOptions(mapStyles.polygon);
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
    processUpload(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.addEventListener('loadend', e => {
            const obj = JSON.parse(e.target.result);
            const coordinates = obj.coordinates;
            const pts = coordinates.map(item => ({ lat: item[1], lng: item[0] }));
            const path = google.maps.geometry.encoding.encodePath(new google.maps.MVCArray(pts));
            this.props.setSelectedPath(path);
        });
        reader.readAsText(file);
    }
    render() {
        const { classes, view } = this.props;
        return (
            <React.Fragment>
                <div ref={this.map_ref} className={classNames({
                    [classes.mapCompact]: view == 'content',
                    [classes.mapExpand]: view == 'map',
                })}></div>
                <a ref={this.download_ref} style={{display: 'none'}} download='walklog.json'></a>
                <input ref={this.upload_ref} type="file" style={{display: 'none'}} />
            </React.Fragment>
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
    const { filter, latitude, longitude, radius, cities } = state.main.search_form;
    const { selected_path, highlighted_path, editing_path, action_queue, panorama, info_window, center, geo_marker, zoom, view, overlay } = state.main;
    return {
        filter, latitude, longitude, radius, cities,
        selected_path, highlighted_path, editing_path, action_queue, panorama,
        info_window, center, geo_marker, zoom, view, overlay,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({
        setSearchForm, setSelectedPath, setCenter, 
        setZoom, removeFromActionQueue, 
        toggleView, setMap, setEditingPath, openConfirmModal,
    }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(Map));
