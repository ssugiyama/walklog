import React, { useRef, useEffect, useState, useContext } from 'react';
import ReactDOM from 'react-dom';
import { toggleView, setSearchForm, setSelectedPath, setCenter, setZoom, setMapLoaded, setEditingPath } from './actions';
import { useSelector, useDispatch } from 'react-redux';
import { makeStyles } from '@material-ui/styles';
import {APPEND_PATH_CONFIRM_INFO} from './confirm-modal';
import ConfirmModal from './confirm-modal';
import config from 'react-global-configuration';
import MapContext from './map-context';
import Box from '@material-ui/core/Box';
import { push } from 'connected-react-router';
import Link from '@material-ui/core/Link';

const styles = () => ({
    hidden: {
        display: 'none',
    },
});

const useStyles = makeStyles(styles);

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
    if (ref) ref.parentNode.insertBefore(script, ref);
}
const CENTER_INTERVAL = 30000;
const RESIZE_INTERVAL = 500;

const Map = props => {
    const latitude = useSelector(state => state.main.searchForm.latitude);
    const longitude = useSelector(state => state.main.searchForm.longitude);
    const radius = useSelector(state => state.main.searchForm.radius);
    const selectedItem = useSelector(state => state.main.selectedItem);
    const pathEditable = useSelector(state => state.main.pathEditable);
    const elevationInfoWindow = useSelector(state => state.main.elevationInfoWindow);
    const geoMarker = useSelector(state => state.main.geoMarker);
    const zoom = useSelector(state => state.main.zoom);
    const mapLoaded = useSelector(state => state.main.mapLoaded);
    const rows = useSelector(state => state.main.result.rows);
    const refs = useRef({});
    const rc = refs.current;
    rc.center = useSelector(state => state.main.center);
    rc.filter = useSelector(state => state.main.searchForm.filter);
    rc.cities = useSelector(state => state.main.searchForm.cities);
    rc.selectedPath = useSelector(state => state.main.selectedPath);
    rc.view = useSelector(state => state.main.view);
    const mapElemRef = useRef();
    const downloadRef = useRef();
    const uploadRef = useRef();
    const [confirmInfo, setConfirmInfo] = useState({open: false});

    const context = useContext(MapContext);
    const dispatch = useDispatch();
    const classes = useStyles(props);

    const handleLinkClick = (url) => {
        dispatch(push(url));
        rc.pathInfoWindow.close();
        if (rc.view != 'content') {
            dispatch(toggleView());
        }
    };

    const addPoint = (lat, lng, append) => {
        const pt = new google.maps.LatLng(lat, lng);
        rc.pathManager.applyPath([pt], append);
    };
    const uploadPath =  () =>  {
        const elem = ReactDOM.findDOMNode(uploadRef.current);
        setTimeout(() => elem.click(), 0);
    };
    const downloadPath = () =>  {
        const content = rc.pathManager.selectionAsGeoJSON();
        const blob = new Blob([ content ], { 'type' : 'application/json' });
        const elem = ReactDOM.findDOMNode(downloadRef.current);
        elem.href = window.URL.createObjectURL(blob);
        setTimeout(() => { elem.click(); window.URL.revokeObjectURL(elem.href); }, 0);
    };
    const clearPaths  = (retainTemporaryAndSelection) => {
        rc.pathManager.deleteAll(retainTemporaryAndSelection);
    };
    const addPaths = (items) => {
        for (const item of items) {
            rc.pathManager.showPath(item.path, false, false, item);
        }
    };

    const initMap = () => {
        if (window.localStorage.center) {
            dispatch(setCenter(JSON.parse(window.localStorage.center)));
        }
        if (window.localStorage.zoom) {
            setZoom(parseInt(window.localStorage.zoom));
        }
        const options = {
            zoom: zoom,
            center: rc.center,
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
        rc.map = new google.maps.Map(mapElemRef.current, options);
        google.maps.event.addListener(rc.map, 'click', async event => {
            if (rc.filter == 'neighborhood'){
                rc.distanceWidget.setCenter(event.latLng.toJSON());
            }
            else if (rc.filter == 'cities') {
                const params = `latitude=${event.latLng.lat()}&longitude=${event.latLng.lng()}`;
                try {
                    const response = await fetch('/api/cities?' + params);
                    const json = await response.json();
                    addCity(json[0].jcode);
                } catch (error) {
                    alert(error);
                }
            }
        });
        google.maps.event.addListener(rc.map, 'center_changed', () => {
            if (! rc.centerIntervalID) {
                rc.centerIntervalID = setTimeout(() => {
                    dispatch(setCenter(rc.map.getCenter().toJSON()));
                    rc.centerIntervalID = null;
                }, CENTER_INTERVAL);
            }
        });
        google.maps.event.addListener(rc.map, 'zoom_changed', () => {
            dispatch(setZoom(rc.map.getZoom()));
        });
        const PathManager = require('./path-manager').default;
        rc.pathManager = new PathManager({map: rc.map});
        rc.pathInfoWindow = new google.maps.InfoWindow();
        google.maps.event.addListener(rc.pathInfoWindow, 'domready', () => {
            const item = rc.clickedItem;
            const url = config.get('itemPrefix') + item.id;
            const link = <Link href="#" onClick={ () => { handleLinkClick(url); }}>{item.date}: {item.title}</Link>;
            ReactDOM.render(link, document.getElementById('path-info-window-content'));
        });
        const pathChanged = () => {
            const nextPath = rc.pathManager.getEncodedSelection();
            if (rc.selectedPath != nextPath) {
                dispatch(setSelectedPath(nextPath));
                if (nextPath) {
                    const pair = rc.pathManager.searchPolyline(nextPath);
                    const item = pair && pair[1];
                    if (item) {
                        rc.clickedItem = item;

                        const content =  '<span id="path-info-window-content">foo</span>';
                        // google.maps.event.clearInstanceListeners(rc.pathInfoWindow);

                        rc.pathInfoWindow.setContent(content);
                        rc.pathInfoWindow.open(rc.map);
                        rc.pathInfoWindow.setPosition(rc.pathManager.lastClickLatLng);
                        // rc.pathInfoWindow.setPosition(path.getPath().getAt(0));
                    }
                    else {
                        rc.pathInfoWindow.close();
                    }
                }
                else {
                    rc.pathInfoWindow.close();
                }
            }
        };
        google.maps.event.addListener(rc.pathManager, 'length_changed', pathChanged);
        google.maps.event.addListener(rc.pathManager, 'selection_changed', pathChanged);
        google.maps.event.addListener(rc.pathManager, 'editable_changed',  () => {
            if (!rc.pathManager.editable) {
                dispatch(setEditingPath(false));
            }
        });
        google.maps.event.addListener(rc.pathManager, 'polylinecomplete',  async polyline => {
            const append = await new Promise((resolve) => {
                if (rc.selectedPath) {
                    setConfirmInfo({open: true, resolve});
                }
                else {
                    resolve(false);
                }
            });
            setConfirmInfo({open: false});
            rc.pathManager.applyPath(polyline.getPath().getArray(), append);
        });
        const circleOpts = Object.assign({}, mapStyles.circle, {
            center: rc.center,
            radius: parseFloat(radius)
        });
        rc.distanceWidget = new google.maps.Circle(circleOpts);
        google.maps.event.addListener(rc.distanceWidget, 'center_changed', () => {
            dispatch(setSearchForm({
                latitude: rc.distanceWidget.getCenter().lat(),
                longitude: rc.distanceWidget.getCenter().lng()
            }));
        });
        google.maps.event.addListener(rc.distanceWidget, 'radius_changed', () => {
            dispatch(setSearchForm({
                radius: rc.distanceWidget.getRadius()
            }));
        });
        rc.map.mapTypes.set('gsi', gsiMapOption());
        const gsiLogo = document.createElement('div');
        gsiLogo.innerHTML = '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" >地理院タイル</a>';
        gsiLogo.style.display = 'none';
        google.maps.event.addListener( rc.map, 'maptypeid_changed', () => {
            const currentMapTypeID = rc.map.getMapTypeId();
            if ( currentMapTypeID == 'gsi' ) {
                gsiLogo.style.display = 'inline';
            } else {
                gsiLogo.style.display = 'none';
            }
        });
        rc.map.controls[ google.maps.ControlPosition.BOTTOM_RIGHT ].push(gsiLogo);
        rc.elevationInfoWindow = new google.maps.InfoWindow();
        rc.marker = new google.maps.Marker(mapStyles.marker);
        if (window.localStorage.selectedPath) {
            dispatch(setSelectedPath(window.localStorage.selectedPath));
        }
        window.addEventListener('resize', handleResize);
        uploadRef.current.addEventListener('change', e => {
            processUpload(e);
        });

        context.setState({
            map: rc.map,
            addPoint,
            uploadPath,
            downloadPath,
            clearPaths,
            addPaths,
        });
        dispatch(setMapLoaded());
    };

    useEffect(() => {
        window.initMap = initMap;
        loadJS('https://maps.googleapis.com/maps/api/js?&libraries=geometry,drawing&callback=initMap&key=' + config.get('googleApiKey'));
    }, []);

    const citiesChanges = () => {
        const a = new Set(rc.cities.split(/,/));
        const b = new Set(Object.keys(rc.cityHash || {}));
        if (a.length !== b.length) return true;
        for (let j of a) {
            if (!b.has(j)) return true;
        }
        return false;
    };
    const handleResize = () => {
        if (! rc.resizeIntervalID) {
            rc.resizeIntervalID = setTimeout(() => {
                google.maps.event.trigger(rc.map, 'resize');
                rc.resizeIntervalID = null;
            }, RESIZE_INTERVAL);
        }
    };
    useEffect(() =>{
        if (! rc.map) return;
        if (elevationInfoWindow.open) {
            rc.elevationInfoWindow.open(rc.map);
            rc.elevationInfoWindow.setPosition(elevationInfoWindow.position);
            rc.elevationInfoWindow.setContent(elevationInfoWindow.message);
        }
        else {
            rc.elevationInfoWindow.close();
        }
    }, [elevationInfoWindow]);
    useEffect(() => {
        if (! rc.map) return;
        const c =  rc.map.getCenter().toJSON();
        if (rc.center.lon != c.lon || rc.center.lng != c.lng)
            rc.map.setCenter(rc.center);
    }, [rc.center]);
    useEffect(() => {
        if (! rc.map) return;
        rc.marker.setPosition({lat: geoMarker.lat, lng: geoMarker.lng});
        rc.marker.setMap(geoMarker.show ? rc.map : null);
    }, [geoMarker]);
    useEffect(() => {
        if (! rc.pathManager) return;
        if (rc.selectedPath && rc.selectedPath != rc.pathManager.getEncodedSelection())
            rc.pathManager.showPath(rc.selectedPath, true);
    }, [rc.selectedPath, mapLoaded]);
    useEffect(() => {
        if (! rc.pathManager) return;
        clearPaths(true);
        addPaths(rows);
    }, [rows, mapLoaded]);
    useEffect(() => {
        if (! rc.pathManager) return;
        if (selectedItem && selectedItem.path != rc.pathManager.getEncodedHighlight())
            rc.pathManager.showPath(selectedItem.path, false, true, selectedItem);
        else if (! selectedItem)
            rc.pathManager.set('highlight', null);
    }, [selectedItem, mapLoaded]);
    useEffect(() => {
        if (! rc.pathManager) return;
        if (pathEditable) {
            rc.pathManager.set('editable', true);
        }
    }, [pathEditable, rc.selectedPath]);

    useEffect(() => {
        if (! rc.distanceWidget) return;
        if (rc.filter == 'neighborhood') {
            rc.distanceWidget.setMap(rc.map);
            rc.distanceWidget.set('radius', parseFloat(radius));
            const center = { lat: latitude, lng: longitude };
            rc.distanceWidget.setCenter(center);
        }
        else {
            rc.distanceWidget.setMap(null);
        }
    }, [rc.filter, radius, latitude, longitude, mapLoaded]);

    useEffect(() => {
        (async () => {
            if (rc.filter == 'cities' && citiesChanges() && ! rc.fetching) {
                if (rc.cityHash) {
                    for (let id of Object.keys(rc.cityHash)) {
                        const pg = rc.cityHash[id];
                        pg.setMap(null);
                    }
                }
                rc.cityHash = {};
                if (rc.cities) {
                    rc.fetching = true;
                    try {
                        const response =  await fetch('/api/cities?jcodes=' + rc.cities);
                        const cities = await response.json();
                        cities.forEach(city => {
                            const pg = toPolygon(city.jcode, city.theGeom);
                            pg.setMap(rc.map);
                        });
                    } catch (error) {
                        alert(error);
                    }
                    rc.fetching = false;
                }
            }
            if (rc.cityHash) {
                for (let id of Object.keys(rc.cityHash)) {
                    const geom = rc.cityHash[id];
                    if (rc.filter == 'cities') {
                        geom.setMap(rc.map);
                    }
                    else {
                        geom.setMap(null);
                    }
                }
            }
        })();
    }, [rc.filter, rc.cities, mapLoaded]);

    // console.log('render map');
    const toPolygon = (id, str) => {
        const paths = str.split(' ').map(element => google.maps.geometry.encoding.decodePath(element));
        const pg =  new google.maps.Polygon({});
        pg.setPaths(paths);
        pg.setOptions(mapStyles.polygon);
        rc.cityHash[id] = pg;
        google.maps.event.addListener(pg, 'click',  () => {
            removeCity(id, pg);
        });
        return pg;
    };
    const addCity = (id) => {
        if (rc.cityHash === undefined) rc.cityHash = {};
        if (rc.cityHash[id]) return;
        const newCities = rc.cities.split(/,/).filter(elm => elm).concat(id).join(',');
        dispatch(setSearchForm({cities: newCities}));
    };
    const removeCity = (id, pg) => {
        const citiesArray = rc.cities.split(/,/);
        const index = citiesArray.indexOf(id);
        if (index >= 0){
            citiesArray.splice(index, 1);
            const newCities = citiesArray.join(',');
            dispatch(setSearchForm({cities: newCities}));
        }
        pg.setMap(null);
        pg = null;
        delete rc.cityHash[id];
    };
    const processUpload = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.addEventListener('loadend', e => {
            const obj = JSON.parse(e.target.result);
            const coordinates = obj.coordinates;
            const pts = coordinates.map(item => ({ lat: item[1], lng: item[0] }));
            const path = google.maps.geometry.encoding.encodePath(new google.maps.MVCArray(pts));
            dispatch(setSelectedPath(path));
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
            <Box ref={mapElemRef}
                my={1}
                color="black"
                {... props}
            ></Box>
            <a ref={downloadRef} className={classes.hidden} download='walklog.json'></a>
            <input ref={uploadRef} type="file" className={classes.hidden} />
            <ConfirmModal {...APPEND_PATH_CONFIRM_INFO} open={confirmInfo.open} resolve={confirmInfo.resolve} />
        </React.Fragment>
    );
};

export default Map;
