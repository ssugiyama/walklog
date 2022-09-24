import React, { useRef, useEffect, useState, useContext } from 'react';
import ReactDOM from 'react-dom';
import { setSearchForm } from '../features/search-form';
import { setSelectedPath, setCenter, setZoom, setMapLoaded, setPathEditable } from '../features/map';
import { toggleView } from '../features/view';
import { useSelector, useDispatch } from 'react-redux';
import { APPEND_PATH_CONFIRM_INFO } from './confirm-modal';
import ConfirmModal from './confirm-modal';
import config from 'react-global-configuration';
import MapContext from './utils/map-context';
import Box from '@mui/material/Box';
import { push } from '@lagunovsky/redux-react-router';
import Link from '@mui/material/Link';
import Checkbox from '@mui/material/Checkbox';
import { FormControlLabel } from '@mui/material';
import GsiMapType from './utils/gsi-map-type';

function loadJS(src) {
    const ref = window.document.getElementsByTagName('script')[0];
    const script = window.document.createElement('script');
    script.src = src;
    script.async = true;
    if (ref) ref.parentNode.insertBefore(script, ref);
}
const CENTER_INTERVAL = 30000;
const RESIZE_INTERVAL = 500;
const GSI_MAP_TYPE    = 'gsi';

const Map = props => {
    const latitude = useSelector(state => state.searchForm.latitude);
    const longitude = useSelector(state => state.searchForm.longitude);
    const radius = useSelector(state => state.searchForm.radius);
    const selectedItem = useSelector(state => state.api.selectedItem);
    const pathEditable = useSelector(state => state.map.pathEditable);
    const elevationInfoWindow = useSelector(state => state.map.elevationInfoWindow);
    const geoMarker = useSelector(state => state.map.geoMarker);
    const zoom = useSelector(state => state.map.zoom);
    const mapLoaded = useSelector(state => state.map.mapLoaded);
    const rows = useSelector(state => state.api.result.rows);
    const refs = useRef({});
    const [customStyle, setCustomStyle] = useState(false);
    const [CustomStyleBoxShown, setCustomStyleBoxShown] = useState();
    const rc = refs.current;
    rc.center = useSelector(state => state.map.center);
    rc.filter = useSelector(state => state.searchForm.filter);
    rc.cities = useSelector(state => state.searchForm.cities);
    rc.selectedPath = useSelector(state => state.map.selectedPath);
    rc.view = useSelector(state => state.view.view);
    const mapElemRef = useRef();
    const CustomStyleBoxRef = useRef();
    const downloadRef = useRef();
    const uploadRef = useRef();
    const [confirmInfo, setConfirmInfo] = useState({open: false});

    const context = useContext(MapContext);
    const dispatch = useDispatch();

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
    const deleteSelectedPath = () => {
        rc.pathManager.deleteSelection();
    };
    const addPaths = (items) => {
        for (const item of items) {
            rc.pathManager.showPath(item.path, false, false, item);
        }
    };

    const initMap = async () => {
        rc.mapStyles = config.get('mapStyleConfig');
        if (window.localStorage.center) {
            dispatch(setCenter(JSON.parse(window.localStorage.center)));
        }
        if (window.localStorage.zoom) {
            setZoom(parseInt(window.localStorage.zoom));
        }
        const mapTypeIds = config.get('mapTypeIds').split(/,/);

        const options = {
            zoom: zoom,
            center: rc.center,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            disableDoubleClickZoom: true,
            scaleControl: true,
            streetViewControl: true,
            mapTypeControlOptions: {
                position: google.maps.ControlPosition.TOP_LEFT,
                mapTypeIds: mapTypeIds,
                style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
            }
        };
        mapElemRef.current.addEventListener('touchmove', event => {
            event.preventDefault();
        });
        rc.map = new google.maps.Map(mapElemRef.current, options);
        if (mapTypeIds.includes(GSI_MAP_TYPE)) {
            new GsiMapType(GSI_MAP_TYPE, rc.map);
        }
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
        const showCustomStyleBox = () => {
            const currentMapTypeID = rc.map.getMapTypeId();
            setCustomStyleBoxShown(rc.mapStyles.map.length > 0 &&
                [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.TERRAIN, google.maps.MapTypeId.HYBRID].includes(currentMapTypeID));
        };
        google.maps.event.addListener(rc.map, 'maptypeid_changed', () => showCustomStyleBox());
        google.maps.event.addListener(rc.map, 'tilesloaded', () => {
            showCustomStyleBox();
            google.maps.event.clearListeners(rc.map, 'tilesloaded');
        });
        rc.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(CustomStyleBoxRef.current);

        const PathManager = require('./utils/path-manager').default;
        rc.pathManager = new PathManager({map: rc.map, styles: rc.mapStyles.polylines});
        const PolygonManage = require('./utils/polygon-manager').default;
        rc.polygonManager = new PolygonManage({map: rc.map, styles: rc.mapStyles.polygons});
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
                dispatch(setPathEditable(false));
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
        google.maps.event.addListener(rc.polygonManager, 'polygon_deleted', id => {
            const citiesArray = rc.cities.split(/,/);
            const index = citiesArray.indexOf(id);
            if (index >= 0){
                citiesArray.splice(index, 1);
                const newCities = citiesArray.join(',');
                dispatch(setSearchForm({cities: newCities}));
            }
        });
        const circleOpts = Object.assign({}, rc.mapStyles.circle, {
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
        rc.elevationInfoWindow = new google.maps.InfoWindow();
        rc.marker = new google.maps.Marker(rc.mapStyles.marker);
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
            deleteSelectedPath,
        });
        dispatch(setMapLoaded());
    };

    useEffect(() => {
        window.initMap = initMap;
        const params = {
            libraries: 'geometry,drawing',
            v:          config.get('googleApiVersion'),
            key:        config.get('googleApiKey'),
            callback:   'initMap',
        };
        loadJS('https://maps.googleapis.com/maps/api/js?' + Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&'));
    }, []);

    const citiesChanges = () => {
        const a = new Set(rc.cities.split(/,/));
        const b = rc.polygonManager.idSet();
        if (a.length !== b.length) return true;
        for (const j of a) {
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
        if (!mapLoaded) return;
        if (rc.selectedPath && rc.selectedPath != rc.pathManager.getEncodedSelection())
            rc.pathManager.showPath(rc.selectedPath, true);
    }, [rc.selectedPath, mapLoaded]);
    useEffect(() => {
        if (!mapLoaded) return;
        clearPaths(true);
        addPaths(rows);
    }, [rows, mapLoaded]);
    useEffect(() => {
        if (!mapLoaded) return;
        if (selectedItem && selectedItem.path != rc.pathManager.getEncodedCurrent())
            rc.pathManager.showPath(selectedItem.path, false, true, selectedItem);
        else if (! selectedItem)
            rc.pathManager.set('current', null);
    }, [selectedItem, mapLoaded]);
    useEffect(() => {
        if (!mapLoaded) return;
        if (pathEditable) {
            rc.pathManager.set('editable', true);
        }
    }, [pathEditable, rc.selectedPath]);

    useEffect(() => {
        if (!mapLoaded) return;
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
        if (!mapLoaded) return;
        (async () => {
            if (rc.filter == 'cities' && citiesChanges() && ! rc.fetching) {
                rc.polygonManager.deleteAll();
                if (rc.cities) {
                    rc.fetching = true;
                    try {
                        const response =  await fetch('/api/cities?jcodes=' + rc.cities);
                        const cities = await response.json();
                        cities.forEach(city => {
                            rc.polygonManager.addPolygon(city.jcode, city.theGeom);
                        });
                    } catch (error) {
                        alert(error);
                    }
                    rc.fetching = false;
                }
            }
            if (rc.filter == 'cities') {
                rc.polygonManager.showAll();
            }
            else {
                rc.polygonManager.hideAll();
            }
        })();
    }, [rc.filter, rc.cities, mapLoaded]);

    const addCity = (id) => {
        const newCities = Array.from(new Set(rc.cities.split(/,/).filter(elm => elm).concat(id))).join(',');
        dispatch(setSearchForm({cities: newCities}));
    };

    const processUpload = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.addEventListener('loadend', e => {
            const obj = JSON.parse(e.target.result);
            const coordinates = obj.coordinates;
            const pts = coordinates.map(item => (new google.maps.LatLng(item[1], item[0])));
            const path = google.maps.geometry.encoding.encodePath(new google.maps.MVCArray(pts));
            dispatch(setSelectedPath(path));
        });
        reader.readAsText(file);
    };
    const handleCustomStyleChange = (e, value) => {
        setCustomStyle(value);
        rc.map.setOptions({ styles: value ? rc.mapStyles.map : [] });
    };
    return (
        <React.Fragment>
            <Box sx={{ display: CustomStyleBoxShown ? 'block' : 'none', m: 1, pl: 1}} ref={CustomStyleBoxRef}>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={customStyle} onChange={handleCustomStyleChange} />}
                    label="custom style"
                >
                </FormControlLabel>
            </Box>
            <Box ref={mapElemRef}
                sx={{
                    my: 1,
                }}
                {... props}
            ></Box>
            <a ref={downloadRef} style={{display: 'none'}} download='walklog.json'></a>
            <input ref={uploadRef} type="file" style={{display: 'none'}} />
            <ConfirmModal {...APPEND_PATH_CONFIRM_INFO} open={confirmInfo.open} resolve={confirmInfo.resolve} />
        </React.Fragment>
    );
};

export default Map;
