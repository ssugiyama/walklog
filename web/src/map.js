import React, { memo, useRef, useEffect, useState, useContext } from 'react';
import ReactDOM from 'react-dom';
import { bindActionCreators } from 'redux';
import { setSearchForm, setSelectedPath, setCenter, setZoom, toggleView, setMapLoaded, setEditingPath } from './actions';
import { connect } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import {APPEND_PATH_CONFIRM_INFO} from './constants';
import ConfirmModal from './confirm-modal';
import config from 'react-global-configuration';
import MapContext from './map-context';
import Fab from '@material-ui/core/Fab';
import ExpandMore from '@material-ui/icons/ExpandMore';
import ExpandLess from '@material-ui/icons/ExpandLess';

const styles = theme => ({
    mapCompact: {
        margin: '0 0 4px 0',
        height: '40vh',
        marginLeft: 'env(safe-area-inset-left)',
        marginRight: 'env(safe-area-inset-right)',
    },
    mapExpand: {
        flexGrow: 1,
        margin: '0 0 4px 0',
        marginLeft: 'env(safe-area-inset-left)',
        marginRight: 'env(safe-area-inset-right)',
    },
    fabButton: {
        position: 'absolute',
        zIndex: 10,
        left: 'calc(50% - 20px)',
        margin: '0 auto',
    },
    fabButtonCompact: {
        top: 'calc(40vh + 48px)',
    },
    fabButtonExpand: {
        bottom: 50,
    },
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

const Map = props => {
    const map_elem_ref = useRef();
    const download_ref = useRef();
    const upload_ref = useRef();
    const [confirmInfo, setConfirmInfo] = useState({open: false});
    const fetchingCities = useRef();
    const map = useRef();
    const path_manager = useRef();
    const city_hash = useRef();
    const distanceWidget = useRef();
    const infoWindow = useRef();
    const marker = useRef();
    const context = useContext(MapContext);
    const {setSearchForm, setSelectedPath, setCenter, setZoom,  
        toggleView, setMapLoaded, setEditingPath,} = props;
    const {classes, latitude, longitude, radius, 
        highlighted_path, editing_path, 
        info_window, geo_marker, zoom, view, map_loaded } = props;
    const center = useRef();
    center.current = props.center;
    const filter = useRef();
    filter.current = props.filter;
    const cities = useRef();
    cities.current = props.cities;
    const selected_path = useRef();
    selected_path.current = props.selected_path;
    const initMap = () => {
        if (window.localStorage.center) {
            setCenter(JSON.parse(window.localStorage.center));
        }
        if (window.localStorage.zoom) {
            setZoom(parseInt(window.localStorage.zoom));
        }
        const options = {
            zoom: zoom,
            center: center.current,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            disableDoubleClickZoom: true,
            scaleControl: true,
            scrollwheel : false,
            gestureHandling: 'auto',
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
        map_elem_ref.current.addEventListener('touchmove', event => {
            event.preventDefault();
        });
        map.current = new google.maps.Map(map_elem_ref.current, options);
        google.maps.event.addListener(map.current, 'click', event => {
            if (filter.current == 'neighborhood'){
                distanceWidget.current.setCenter(event.latLng.toJSON());
            }
            else if (filter.current == 'cities') {
                const params = `latitude=${event.latLng.lat()}&longitude=${event.latLng.lng()}`;
                fetch('/api/cities?' + params)
                    .then(response => response.json())
                    .then(json => addCity(json[0].jcode))
                    .catch(ex => alert(ex));
            }
        });
        google.maps.event.addListener(map.current, 'center_changed', () => {
            const c =  map.current.getCenter().toJSON();
            if (center.current.lon != c.lon || center.current.lng != c.lng)
                setCenter(c);
        });
        google.maps.event.addListener(map.current, 'zoom_changed', () => {
            setZoom(map.current.getZoom());
        });
        const PathManager = require('./path-manager').default;
        path_manager.current = new PathManager({map: map.current});
        const path_changed = () => {
            const next_path = path_manager.current.getEncodedSelection();
            if (selected_path.current != next_path) {
                setSelectedPath(next_path);
            }
        };
        google.maps.event.addListener(path_manager.current, 'length_changed', path_changed);
        google.maps.event.addListener(path_manager.current, 'selection_changed', path_changed);
        google.maps.event.addListener(path_manager.current, 'editable_changed',  () => {
            if (!path_manager.current.editable) {
                setEditingPath(false);
            }
        });
        google.maps.event.addListener(path_manager.current, 'polylinecomplete',  polyline => {
            new Promise((resolve, reject) => {
                if (selected_path.current) {
                    setConfirmInfo({open: true, resolve});
                }
                else {
                    resolve(false);
                }
            }).then(append => {
                setConfirmInfo({open: false});
                path_manager.current.applyPath(polyline.getPath().getArray(), append);
            });
        });
        const circleOpts = Object.assign({}, mapStyles.circle, {
            center: center.current,
            radius: parseFloat(radius)
        });
        distanceWidget.current = new google.maps.Circle(circleOpts);
        google.maps.event.addListener(distanceWidget.current, 'center_changed', () => {
            setSearchForm({
                latitude: distanceWidget.current.getCenter().lat(),
                longitude: distanceWidget.current.getCenter().lng()
            });
        });
        google.maps.event.addListener(distanceWidget.current, 'radius_changed', () => {
            setSearchForm({
                radius: distanceWidget.current.getRadius()
            });
        });
        map.current.mapTypes.set('gsi', gsiMapOption());
        const gsiLogo = document.createElement('div');
        gsiLogo.innerHTML = '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" >地理院タイル</a>';
        gsiLogo.style.display = 'none';
        google.maps.event.addListener( map.current, 'maptypeid_changed', () => {
            const currentMapTypeID = map.current.getMapTypeId();
            if ( currentMapTypeID == 'gsi' ) {
                gsiLogo.style.display = 'inline';
            } else {
                gsiLogo.style.display = 'none';
            }
        });
        map.current.controls[ google.maps.ControlPosition.BOTTOM_RIGHT ].push(gsiLogo);
        infoWindow.current = new google.maps.InfoWindow();
        marker.current = new google.maps.Marker(mapStyles.marker);
        if (window.localStorage.selected_path) {
            setSelectedPath(window.localStorage.selected_path);
        }
        window.addEventListener('resize', handleResize);
        upload_ref.current.addEventListener('change', e => {
            processUpload(e);
        });
        context.setState({
            map: map.current,
            addPoint: (lat, lng, append) => {
                const pt = new google.maps.LatLng(lat, lng);
                path_manager.current.applyPath([pt], append);
            },
            uploadPath: () =>  {
                const elem = ReactDOM.findDOMNode(upload_ref.current);
                setTimeout(() => elem.click(), 0);
            },
            downloadPath: () =>  {
                const content = path_manager.current.selectionAsGeoJSON();
                const blob = new Blob([ content ], { 'type' : 'application/json' });
                const elem = ReactDOM.findDOMNode(download_ref.current);
                elem.href = window.URL.createObjectURL(blob);
                setTimeout(() => { elem.click(); window.URL.revokeObjectURL(elem.href); }, 0);
            },
            clearPaths: () => {
                path_manager.current.deleteAll();
            },
            addPaths: (paths) => {
                for (let path of paths) {
                    path_manager.current.showPath(path, false, false);
                }
            },
        });
        setMapLoaded();
    };
    
    useEffect(() => {
        window.initMap = initMap;
        loadJS('https://maps.googleapis.com/maps/api/js?&libraries=geometry,drawing&callback=initMap&key=' + config.get('google_api_key'));
    }, []);
    
    const citiesChanges = () => {
        const a = new Set(cities.split(/,/));
        const b = new Set(Object.keys(city_hash.current || {}));
        if (a.length !== b.length) return true;
        for (let j of a) {
            if (!b.has(j)) return true;
        }
        return false;
    }
    const handleResize = () => {
        setTimeout(() => {
            google.maps.event.trigger(map.current, 'resize');
        }, 500);
    };
    useEffect(() =>{
        if (! map.current) return;
        if (info_window.open) {
            infoWindow.current.open(map.current);
            infoWindow.current.setPosition(info_window.position);
            infoWindow.current.setContent(info_window.message);
        }
        else {
            infoWindow.current.close();
        }
    }, [info_window])
    useEffect(() => {
        if (! map.current) return;
        map.current.setCenter(center.current);
    }, [center.current]);
    useEffect(() => {
        if (! map.current) return;
        marker.current.setPosition({lat: geo_marker.lat, lng: geo_marker.lng});
        marker.current.setMap(geo_marker.show ? map.current : null);
    }, [geo_marker]);
    useEffect(() => {
        if (! path_manager.current) return;
        if (selected_path.current)
            path_manager.current.showPath(selected_path.current, true);
    }, [selected_path.current]);
    useEffect(() => {
        if (! path_manager.current) return;
        if (highlighted_path)
            path_manager.current.showPath(highlighted_path, true);
        else
            path_manager.current.set('highlight', null);
    }, [highlighted_path]);
    useEffect(() => {
        if (! path_manager.current) return;
        if (editing_path) {
            path_manager.current.set('editable', true);
        }
    }, [editing_path]);
    useEffect(() => {
        if (! distanceWidget.current) return;
        if (filter.current == 'neighborhood') {
            distanceWidget.current.setMap(map.current);
            distanceWidget.current.set('radius', parseFloat(radius));
            const center = { lat: latitude, lng: longitude };
            distanceWidget.current.setCenter(center);
        }
        else {
            distanceWidget.current.setMap(null);
        }
        if (filter.current == 'cities' && citiesChanges() && ! fetchingCities.current) {
            if (city_hash.current) {
                for (let id of Object.keys(city_hash.current)) {
                    const pg = city_hash.current[id];
                    pg.setMap(null);
                }
            }
            city_hash.current = {};
            if (cities) {
                fetchingCities.current = true;
                fetch('/api/cities?jcodes=' + cities)
                    .then(response => response.json())
                    .then(cities => {
                        cities.forEach(city => {
                            const pg = toPolygon(city.jcode, city.the_geom);
                            pg.setMap(map.current);
                        });
                    })
                    .catch(ex => {
                        alert(ex);
                    })
                    .then(() => {
                        fetchingCities.current = false;
                    });
            }
        }
        if (city_hash.current) {
            for (let id of Object.keys(city_hash.current)) {
                const geom = city_hash.current[id];
                if (filter.current == 'cities') {
                    geom.setMap(map.current);
                }
                else {
                    geom.setMap(null);
                }
            }
        }
    }, [filter.current, radius, latitude, longitude, cities.current, map_loaded]);

    // console.log('render map');
    const toPolygon = (id, str) => {
        const paths = str.split(' ').map(element => google.maps.geometry.encoding.decodePath(element));
        const pg =  new google.maps.Polygon({});
        pg.setPaths(paths);
        pg.setOptions(mapStyles.polygon);
        city_hash.current[id] = pg;
        google.maps.event.addListener(pg, 'click',  event => {
            removeCity(id, pg);
        });
        return pg;
    };
    const addCity = (id) => {
        if (city_hash.current === undefined) city_hash.current = {};
        if (city_hash.current[id]) return;
        const new_cities = cities.current.split(/,/).filter(elm => elm).concat(id).join(',');
        setSearchForm({cities: new_cities});
    };
    const removeCity = (id, pg) => {
        const cities_array = cities.current.split(/,/);
        const index = cities_array.indexOf(id);
        if (index >= 0){
            cities_array.splice(index, 1);
            const new_cities = cities_array.join(',');
            setSearchForm({cities: new_cities});
        }
        pg.setMap(null);
        pg = null;
        delete city_hash.current[id];
    };
    const processUpload = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.addEventListener('loadend', e => {
            const obj = JSON.parse(e.target.result);
            const coordinates = obj.coordinates;
            const pts = coordinates.map(item => ({ lat: item[1], lng: item[0] }));
            const path = google.maps.geometry.encoding.encodePath(new google.maps.MVCArray(pts));
            setSelectedPath(path);
        });
        reader.readAsText(file);
    };
    const gsiMapOption = () => {
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
    };

    return (
        <React.Fragment>
            <div ref={map_elem_ref} className={classNames({
                [classes.mapCompact]: view == 'content',
                [classes.mapExpand]: view == 'map',
            })}></div>
            <Fab size="small" aria-label="toggle view"
                color="secondary"
                className={classNames(classes.fabButton, {
                    [classes.fabButtonExpand]: view == 'map', 
                    [classes.fabButtonCompact]: view == 'content'})}
                onClick={event => { toggleView(); }} >
                {  view == 'content' ? <ExpandMore /> : <ExpandLess /> }
            </Fab>
            <a ref={download_ref} style={{display: 'none'}} download='walklog.json'></a>
            <input ref={upload_ref} type="file" style={{display: 'none'}} />
            <ConfirmModal {...APPEND_PATH_CONFIRM_INFO} open={confirmInfo.open} resolve={confirmInfo.resolve} />
        </React.Fragment>
    );
};

function mapStateToProps(state) {
    const { filter, latitude, longitude, radius, cities } = state.main.search_form;
    const { selected_path, highlighted_path, editing_path, info_window, center, geo_marker, zoom, view, map_loaded  } = state.main;
    return {
        filter, latitude, longitude, radius, cities,
        selected_path, highlighted_path, editing_path, 
        info_window, center, geo_marker, zoom, view, map_loaded
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({
        setSearchForm, setSelectedPath, setCenter, setZoom, 
        toggleView, setMapLoaded, setEditingPath,
    }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(memo(Map)));
