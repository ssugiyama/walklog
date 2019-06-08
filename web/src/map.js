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
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import { compareWithMapLoaded } from './utils';

const styles = () => ({
    mapCompact: {
        color: 'black',
        margin: '0 0 4px 0',
        height: '40vh',
        marginLeft: 'env(safe-area-inset-left)',
        marginRight: 'env(safe-area-inset-right)',
    },
    mapExpand: {
        color: 'black',
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
const CENTER_INTERVAL = 30000;
const RESIZE_INTERVAL = 500;

const Map = props => {
    const mapElemRef = useRef();
    const downloadRef = useRef();
    const uploadRef = useRef();
    const [confirmInfo, setConfirmInfo] = useState({open: false});
    const refs = useRef();
    const context = useContext(MapContext);
    const {setSearchForm, setSelectedPath, setCenter, setZoom,  
        toggleView, setMapLoaded, setEditingPath,} = props;
    const {classes, latitude, longitude, radius, 
        highlightedPath, pathEditable,
        infoWindow, geoMarker, zoom, view, mapLoaded } = props;
    for (const p of ['center', 'filter', 'cities', 'selectedPath']) {
        refs[p] = props[p];
    }
        
    const initMap = () => {
        if (window.localStorage.center) {
            setCenter(JSON.parse(window.localStorage.center));
        }
        if (window.localStorage.zoom) {
            setZoom(parseInt(window.localStorage.zoom));
        }
        const options = {
            zoom: zoom,
            center: refs.center,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            disableDoubleClickZoom: true,
            scaleControl: true,
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
        mapElemRef.current.addEventListener('touchmove', event => {
            event.preventDefault();
        });
        refs.map = new google.maps.Map(mapElemRef.current, options);
        google.maps.event.addListener(refs.map, 'click', event => {
            if (refs.filter == 'neighborhood'){
                refs.distanceWidget.setCenter(event.latLng.toJSON());
            }
            else if (refs.filter == 'cities') {
                const params = `latitude=${event.latLng.lat()}&longitude=${event.latLng.lng()}`;
                fetch('/api/cities?' + params)
                    .then(response => response.json())
                    .then(json => addCity(json[0].jcode))
                    .catch(ex => alert(ex));
            }
        });
        google.maps.event.addListener(refs.map, 'center_changed', () => {
            if (! refs.centerIntervalID) {
                refs.centerIntervalID = setTimeout(() => {
                    setCenter(refs.map.getCenter().toJSON());
                    refs.centerIntervalID = null;
                }, CENTER_INTERVAL);
            } 
        });
        google.maps.event.addListener(refs.map, 'zoom_changed', () => {
            setZoom(refs.map.getZoom());
        });
        const PathManager = require('./path-manager').default;
        refs.pathManager = new PathManager({map: refs.map});
        const pathChanged = () => {
            const nextPath = refs.pathManager.getEncodedSelection();
            if (refs.selectedPath != nextPath) {
                setSelectedPath(nextPath);
            }
        };
        google.maps.event.addListener(refs.pathManager, 'length_changed', pathChanged);
        google.maps.event.addListener(refs.pathManager, 'selection_changed', pathChanged);
        google.maps.event.addListener(refs.pathManager, 'editable_changed',  () => {
            if (!refs.pathManager.editable) {
                setEditingPath(false);
            }
        });
        google.maps.event.addListener(refs.pathManager, 'polylinecomplete',  polyline => {
            new Promise((resolve) => {
                if (refs.selectedPath) {
                    setConfirmInfo({open: true, resolve});
                }
                else {
                    resolve(false);
                }
            }).then(append => {
                setConfirmInfo({open: false});
                refs.pathManager.applyPath(polyline.getPath().getArray(), append);
            });
        });
        const circleOpts = Object.assign({}, mapStyles.circle, {
            center: refs.center,
            radius: parseFloat(radius)
        });
        refs.distanceWidget = new google.maps.Circle(circleOpts);
        google.maps.event.addListener(refs.distanceWidget, 'center_changed', () => {
            setSearchForm({
                latitude: refs.distanceWidget.getCenter().lat(),
                longitude: refs.distanceWidget.getCenter().lng()
            });
        });
        google.maps.event.addListener(refs.distanceWidget, 'radius_changed', () => {
            setSearchForm({
                radius: refs.distanceWidget.getRadius()
            });
        });
        refs.map.mapTypes.set('gsi', gsiMapOption());
        const gsiLogo = document.createElement('div');
        gsiLogo.innerHTML = '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" >地理院タイル</a>';
        gsiLogo.style.display = 'none';
        google.maps.event.addListener( refs.map, 'maptypeid_changed', () => {
            const currentMapTypeID = refs.map.getMapTypeId();
            if ( currentMapTypeID == 'gsi' ) {
                gsiLogo.style.display = 'inline';
            } else {
                gsiLogo.style.display = 'none';
            }
        });
        refs.map.controls[ google.maps.ControlPosition.BOTTOM_RIGHT ].push(gsiLogo);
        refs.infoWindow = new google.maps.InfoWindow();
        refs.marker = new google.maps.Marker(mapStyles.marker);
        if (window.localStorage.selectedPath) {
            setSelectedPath(window.localStorage.selectedPath);
        }
        window.addEventListener('resize', handleResize);
        uploadRef.current.addEventListener('change', e => {
            processUpload(e);
        });
        context.setState({
            map: refs.map,
            addPoint: (lat, lng, append) => {
                const pt = new google.maps.LatLng(lat, lng);
                refs.pathManager.applyPath([pt], append);
            },
            uploadPath: () =>  {
                const elem = ReactDOM.findDOMNode(uploadRef.current);
                setTimeout(() => elem.click(), 0);
            },
            downloadPath: () =>  {
                const content = refs.pathManager.selectionAsGeoJSON();
                const blob = new Blob([ content ], { 'type' : 'application/json' });
                const elem = ReactDOM.findDOMNode(downloadRef.current);
                elem.href = window.URL.createObjectURL(blob);
                setTimeout(() => { elem.click(); window.URL.revokeObjectURL(elem.href); }, 0);
            },
            clearPaths: () => {
                refs.pathManager.deleteAll();
            },
            addPaths: (paths) => {
                for (let path of paths) {
                    refs.pathManager.showPath(path, false, false);
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
        const a = new Set(refs.cities.split(/,/));
        const b = new Set(Object.keys(refs.cityHash || {}));
        if (a.length !== b.length) return true;
        for (let j of a) {
            if (!b.has(j)) return true;
        }
        return false;
    };
    const handleResize = () => {
        if (! refs.resizeIntervalID) {
            refs.resizeIntervalID = setTimeout(() => {
                google.maps.event.trigger(refs.map, 'resize');
                refs.resizeIntervalID = null;
            }, RESIZE_INTERVAL);
        }
    };
    useEffect(() =>{
        if (! refs.map) return;
        if (infoWindow.open) {
            refs.infoWindow.open(refs.map);
            refs.infoWindow.setPosition(infoWindow.position);
            refs.infoWindow.setContent(infoWindow.message);
        }
        else {
            refs.infoWindow.close();
        }
    }, [infoWindow]);
    useEffect(() => {
        if (! refs.map) return;
        const c =  refs.map.getCenter().toJSON();
        if (refs.center.lon != c.lon || refs.center.lng != c.lng)
            refs.map.setCenter(refs.center);
    }, [refs.center]);
    useEffect(() => {
        if (! refs.map) return;
        refs.marker.setPosition({lat: geoMarker.lat, lng: geoMarker.lng});
        refs.marker.setMap(geoMarker.show ? refs.map : null);
    }, [geoMarker]);
    useEffect(() => {
        if (! refs.pathManager) return;
        if (refs.selectedPath && refs.selectedPath != refs.pathManager.getEncodedSelection())
            refs.pathManager.showPath(refs.selectedPath, true);
    }, [refs.selectedPath, mapLoaded]);
    useEffect(() => {
        if (! refs.pathManager) return;
        if (highlightedPath && highlightedPath != refs.pathManager.getEncodedHighlight())
            refs.pathManager.showPath(highlightedPath, false, true);
        else if (! highlightedPath)
            refs.pathManager.set('highlight', null);
    }, [highlightedPath, mapLoaded]);
    useEffect(() => {
        if (! refs.pathManager) return;
        if (pathEditable) {
            refs.pathManager.set('editable', true);
        }
    }, [pathEditable, refs.selectedPath]);

    useEffect(() => {
        if (! refs.distanceWidget) return;
        if (refs.filter == 'neighborhood') {
            refs.distanceWidget.setMap(refs.map);
            refs.distanceWidget.set('radius', parseFloat(radius));
            const center = { lat: latitude, lng: longitude };
            refs.distanceWidget.setCenter(center);
        }
        else {
            refs.distanceWidget.setMap(null);
        }
    }, [refs.filter, radius, latitude, longitude, mapLoaded]);
    
    useEffect(() => {
        if (refs.filter == 'cities' && citiesChanges() && ! refs.fetching) {
            if (refs.cityHash) {
                for (let id of Object.keys(refs.cityHash)) {
                    const pg = refs.cityHash[id];
                    pg.setMap(null);
                }
            }
            refs.cityHash = {};
            if (refs.cities) {
                refs.fetching = true;
                fetch('/api/cities?jcodes=' + refs.cities)
                    .then(response => response.json())
                    .then(cities => {
                        cities.forEach(city => {
                            const pg = toPolygon(city.jcode, city.theGeom);
                            pg.setMap(refs.map);
                        });
                    })
                    .catch(ex => {
                        alert(ex);
                    })
                    .then(() => {
                        refs.fetching = false;
                    });
            }
        }
        if (refs.cityHash) {
            for (let id of Object.keys(refs.cityHash)) {
                const geom = refs.cityHash[id];
                if (refs.filter == 'cities') {
                    geom.setMap(refs.map);
                }
                else {
                    geom.setMap(null);
                }
            }
        }
    }, [refs.filter, refs.cities, mapLoaded]);

    // console.log('render map');
    const toPolygon = (id, str) => {
        const paths = str.split(' ').map(element => google.maps.geometry.encoding.decodePath(element));
        const pg =  new google.maps.Polygon({});
        pg.setPaths(paths);
        pg.setOptions(mapStyles.polygon);
        refs.cityHash[id] = pg;
        google.maps.event.addListener(pg, 'click',  () => {
            removeCity(id, pg);
        });
        return pg;
    };
    const addCity = (id) => {
        if (refs.cityHash === undefined) refs.cityHash = {};
        if (refs.cityHash[id]) return;
        const newCities = refs.cities.split(/,/).filter(elm => elm).concat(id).join(',');
        setSearchForm({cities: newCities});
    };
    const removeCity = (id, pg) => {
        const citiesArray = refs.cities.split(/,/);
        const index = citiesArray.indexOf(id);
        if (index >= 0){
            citiesArray.splice(index, 1);
            const newCities = citiesArray.join(',');
            setSearchForm({cities: newCities});
        }
        pg.setMap(null);
        pg = null;
        delete refs.cityHash[id];
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
                const img = ownerDocument.createElement('img');
                img.id = 'gsi-map-layer-image';
                img.style.width = '256px';
                img.style.height = '256px';
                const x = (tileCoord.x % Math.pow(2, zoom)).toString();
                const y = tileCoord.y.toString();
                img.src = `http://cyberjapandata.gsi.go.jp/xyz/${tileType}/${zoom}/${x}/${y}.${tileExtension}`;
                return img;
            }
        };
    };

    return (
        <React.Fragment>
            <div ref={mapElemRef} className={classNames({
                [classes.mapCompact]: view == 'content',
                [classes.mapExpand]: view == 'map',
            })}></div>
            <Fab size="small" aria-label="toggle view"
                color="secondary"
                className={classNames(classes.fabButton, {
                    [classes.fabButtonExpand]: view == 'map', 
                    [classes.fabButtonCompact]: view == 'content'})}
                onClick={() => { toggleView(); }} >
                {  view == 'content' ? <ExpandMoreIcon /> : <ExpandLessIcon /> }
            </Fab>
            <a ref={downloadRef} style={{display: 'none'}} download='walklog.json'></a>
            <input ref={uploadRef} type="file" style={{display: 'none'}} />
            <ConfirmModal {...APPEND_PATH_CONFIRM_INFO} open={confirmInfo.open} resolve={confirmInfo.resolve} />
        </React.Fragment>
    );
};

function mapStateToProps(state) {
    const { filter, latitude, longitude, radius, cities } = state.main.searchForm;
    const { selectedPath, highlightedPath, pathEditable, infoWindow, center, geoMarker, zoom, view, mapLoaded  } = state.main;
    return {
        filter, latitude, longitude, radius, cities,
        selectedPath, highlightedPath, pathEditable, 
        infoWindow, center, geoMarker, zoom, view, mapLoaded
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({
        setSearchForm, setSelectedPath, setCenter, setZoom, 
        toggleView, setMapLoaded, setEditingPath,
    }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(memo(Map, compareWithMapLoaded)));
