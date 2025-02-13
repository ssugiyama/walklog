import React, {
    useRef, useEffect, useState, useContext,
} from 'react';
import { createRoot } from 'react-dom/client';
import { useSelector, useDispatch } from 'react-redux';
import config from 'react-global-configuration';
import { Box, Button } from '@mui/material';
import { push } from '@lagunovsky/redux-react-router';
import moment from 'moment';
import { setSearchForm } from '../features/search-form';
import {
    setSelectedPath, setCenter, setZoom, setMapLoaded, setPathEditable, setAutoGeolocation,
} from '../features/map';
import { toggleView } from '../features/view';
import ConfirmModal, { APPEND_PATH_CONFIRM_INFO } from './confirm-modal';
import MapContext from '../utils/map-context';
import createGsiMapType from '../utils/gsi-map-type';

function loadJS(src) {
    const ref = window.document.getElementsByTagName('script')[0];
    const script = window.document.createElement('script');
    script.src = src;
    script.async = true;
    if (ref) ref.parentNode.insertBefore(script, ref);
}
const CENTER_INTERVAL = 30000;
const RESIZE_INTERVAL = 500;
const GSI_MAP_TYPE = 'gsi';

const Map = (props) => {
    const latitude = useSelector((state) => state.searchForm.latitude);
    const longitude = useSelector((state) => state.searchForm.longitude);
    const radius = useSelector((state) => state.searchForm.radius);
    const selectedItem = useSelector((state) => state.api.selectedItem);
    const pathEditable = useSelector((state) => state.map.pathEditable);
    const elevationInfoWindow = useSelector((state) => state.map.elevationInfoWindow);
    const geoMarker = useSelector((state) => state.map.geoMarker);
    const zoom = useSelector((state) => state.map.zoom);
    const mapLoaded = useSelector((state) => state.map.mapLoaded);
    const rows = useSelector((state) => state.api.result.rows);
    const refs = useRef({});
    const rc = refs.current;
    rc.center = useSelector((state) => state.map.center);
    rc.filter = useSelector((state) => state.searchForm.filter);
    rc.cities = useSelector((state) => state.searchForm.cities);
    rc.selectedPath = useSelector((state) => state.map.selectedPath);
    rc.view = useSelector((state) => state.view.view);
    rc.autoGeolocation = useSelector((state) => state.map.autoGeolocation);
    const mapElemRef = useRef();
    const downloadRef = useRef();
    const uploadRef = useRef();
    const jsLoaded = useRef(false);
    const [confirmInfo, setConfirmInfo] = useState({ open: false });

    const context = useContext(MapContext);
    const dispatch = useDispatch();

    const handleLinkClick = (url) => {
        dispatch(push(url));
        rc.pathInfoWindow.close();
        if (rc.view !== 'content') {
            dispatch(toggleView());
        }
    };

    const addPoint = (lat, lng, append) => {
        const pt = new google.maps.LatLng(lat, lng);
        rc.pathManager.applyPath([pt], append);
    };
    const uploadPath = () => {
        setTimeout(() => uploadRef.current.click(), 0);
    };
    const downloadPath = () => {
        const content = rc.pathManager.selectionAsGeoJSON();
        const blob = new Blob([content], { type: 'application/json' });
        const elem = downloadRef.current;
        elem.href = window.URL.createObjectURL(blob);
        setTimeout(() => { elem.click(); window.URL.revokeObjectURL(elem.href); }, 0);
    };
    const clearPaths = (retainTemporaryAndSelection) => {
        rc.pathManager.deleteAll(retainTemporaryAndSelection);
    };
    const deleteSelectedPath = () => {
        rc.pathManager.deleteSelection();
    };
    const addPaths = (items) => {
        items.forEach((item) => rc.pathManager.showPath(item.path, false, false, item));
    };

    const pathChanged = () => {
        if (!rc.pathManager) return;
        const nextPath = rc.pathManager.getEncodedSelection();
        if (rc.selectedPath !== nextPath) {
            dispatch(setSelectedPath(nextPath));
            if (nextPath) {
                const pair = rc.pathManager.searchPolyline(nextPath);
                const item = pair && pair[1];
                if (rc.autoGeolocation || item) {
                    rc.clickedItem = item;
                    const content = '<span id="path-info-window-content">foo</span>';
                    rc.pathInfoWindow.setContent(content);
                    rc.pathInfoWindow.open(rc.map);
                    const pos = rc.autoGeolocation ?
                        rc.pathManager.lastAppendLatLng() :
                        rc.pathManager.lastClickLatLng;
                    if (pos) rc.pathInfoWindow.setPosition(pos);
                } else {
                    rc.pathInfoWindow.close();
                }
            } else {
                rc.pathInfoWindow.close();
            }
        } else {
            rc.pathInfoWindow.close();
        }
    };

    const processUpload = (e1) => {
        const file = e1.target.files[0];
        const reader = new FileReader();
        reader.addEventListener('loadend', (e2) => {
            const obj = JSON.parse(e2.target.result);
            const { coordinates } = obj;
            const pts = coordinates.map((item) => (new google.maps.LatLng(item[1], item[0])));
            const path = google.maps.geometry.encoding.encodePath(new google.maps.MVCArray(pts));
            dispatch(setSelectedPath(path));
        });
        reader.readAsText(file);
    };

    const handleResize = () => {
        if (!rc.resizeIntervalID) {
            rc.resizeIntervalID = setTimeout(() => {
                google.maps.event.trigger(rc.map, 'resize');
                rc.resizeIntervalID = null;
            }, RESIZE_INTERVAL);
        }
    };

    const addCity = (id) => {
        const newCities = Array.from(new Set(rc.cities.split(/,/).filter((elm) => elm).concat(id))).join(',');
        dispatch(setSearchForm({ cities: newCities }));
    };

    const initMap = async () => {
        if (mapLoaded) return;
        rc.mapStyles = config.get('mapStyleConfig');
        if (window.localStorage.center) {
            dispatch(setCenter(JSON.parse(window.localStorage.center)));
        }
        if (window.localStorage.zoom) {
            setZoom(parseInt(window.localStorage.zoom, 10));
        }
        const mapTypeIds = config.get('mapTypeIds').split(/,/);

        const options = {
            zoom,
            center: rc.center,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            disableDoubleClickZoom: true,
            scaleControl: true,
            streetViewControl: true,
            mapId: config.get('mapId'),
            mapTypeControlOptions: {
                position: google.maps.ControlPosition.TOP_LEFT,
                mapTypeIds,
                style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
            },
        };
        mapElemRef.current.addEventListener('touchmove', (event) => {
            event.preventDefault();
        });
        rc.map = new google.maps.Map(mapElemRef.current, options);
        if (mapTypeIds.includes(GSI_MAP_TYPE)) {
            createGsiMapType(GSI_MAP_TYPE, rc.map);
        }
        google.maps.event.addListener(rc.map, 'click', async (event) => {
            if (['neighborhood', 'start', 'end'].includes(rc.filter)) {
                rc.distanceWidget.setCenter(event.latLng.toJSON());
            } else if (rc.filter === 'cities') {
                const params = `latitude=${event.latLng.lat()}&longitude=${event.latLng.lng()}`;
                try {
                    const response = await fetch(`/api/cities?${params}`);
                    const json = await response.json();
                    addCity(json[0].jcode);
                } catch (error) {
                    window.alert(error);
                }
            }
        });
        google.maps.event.addListener(rc.map, 'center_changed', () => {
            if (!rc.centerIntervalID) {
                rc.centerIntervalID = setTimeout(() => {
                    dispatch(setCenter(rc.map.getCenter().toJSON()));
                    rc.centerIntervalID = null;
                }, CENTER_INTERVAL);
            }
        });
        google.maps.event.addListener(rc.map, 'zoom_changed', () => {
            dispatch(setZoom(rc.map.getZoom()));
        });
        google.maps.event.addListener(rc.map, 'tilesloaded', () => {
            google.maps.event.clearListeners(rc.map, 'tilesloaded');
        });

        const PathManager = require('../utils/path-manager').default;
        rc.pathManager = new PathManager({ map: rc.map, styles: rc.mapStyles.polylines });
        const PolygonManage = require('../utils/polygon-manager').default;
        rc.polygonManager = new PolygonManage({ map: rc.map, styles: rc.mapStyles.polygons });
        rc.pathInfoWindow = new google.maps.InfoWindow();
        google.maps.event.addListener(rc.pathInfoWindow, 'domready', () => {
            let content;
            if (rc.autoGeolocation) {
                content = `geolocation at ${moment().format('HH:mm')}`;
            } else {
                const item = rc.clickedItem;
                const url = config.get('itemPrefix') + item.id;
                content = (
                    <Button onClick={() => { handleLinkClick(url); }}>
                        {item.date}
                        :
                        {' '}
                        {item.title}
                    </Button>
                );
            }
            const root = createRoot(document.getElementById('path-info-window-content'));
            root.render(content);
        });
        google.maps.event.addListener(rc.pathInfoWindow, 'closeclick', () => {
            if (rc.autoGeolocation) dispatch(setAutoGeolocation(false));
        });
        google.maps.event.addListener(rc.pathManager, 'length_changed', pathChanged);
        google.maps.event.addListener(rc.pathManager, 'selection_changed', pathChanged);
        google.maps.event.addListener(rc.pathManager, 'editable_changed', () => {
            if (!rc.pathManager.editable) {
                dispatch(setPathEditable(false));
            }
        });
        google.maps.event.addListener(rc.pathManager, 'polylinecomplete', async (polyline) => {
            const append = await new Promise((resolve) => {
                if (rc.selectedPath) {
                    setConfirmInfo({ open: true, resolve });
                } else {
                    resolve(false);
                }
            });
            setConfirmInfo({ open: false });
            rc.pathManager.applyPath(polyline.getPath().getArray(), append);
        });
        google.maps.event.addListener(rc.polygonManager, 'polygon_deleted', (id) => {
            const citiesArray = rc.cities.split(/,/);
            const index = citiesArray.indexOf(id);
            if (index >= 0) {
                citiesArray.splice(index, 1);
                const newCities = citiesArray.join(',');
                dispatch(setSearchForm({ cities: newCities }));
            }
        });
        const circleOpts = {
            ...rc.mapStyles.circle,
            center: rc.center,
            radius: parseFloat(radius),
        };
        rc.distanceWidget = new google.maps.Circle(circleOpts);
        google.maps.event.addListener(rc.distanceWidget, 'center_changed', () => {
            dispatch(setSearchForm({
                latitude: rc.distanceWidget.getCenter().lat(),
                longitude: rc.distanceWidget.getCenter().lng(),
            }));
        });
        google.maps.event.addListener(rc.distanceWidget, 'radius_changed', () => {
            dispatch(setSearchForm({
                radius: rc.distanceWidget.getRadius(),
            }));
        });
        rc.elevationInfoWindow = new google.maps.InfoWindow();
        rc.marker = new google.maps.marker.AdvancedMarkerElement();
        if (window.localStorage.selectedPath) {
            dispatch(setSelectedPath(window.localStorage.selectedPath));
        }
        window.addEventListener('resize', handleResize);
        uploadRef.current.addEventListener('change', (e) => {
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

    useEffect(() => { if (mapLoaded) pathChanged(); }, [rc.autoGeolocation]);

    useEffect(() => {
        if (!jsLoaded.current) {
            jsLoaded.current = true;
            window.initMap = initMap;
            const params = {
                loading: 'async',
                libraries: 'geometry,drawing,marker',
                v: config.get('googleApiVersion'),
                key: config.get('googleApiKey'),
                callback: 'initMap',
            };
            loadJS(`https://maps.googleapis.com/maps/api/js?${Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&')}`);
        }
    }, []);

    const citiesChanges = () => {
        const a = rc.cities.split(/,/);
        const b = rc.polygonManager.idSet();
        if (a.length !== b.length) return true;
        if (a.some((j) => !b.has(j))) return true;
        return false;
    };

    useEffect(() => {
        if (rc.map) {
            if (elevationInfoWindow.open) {
                rc.elevationInfoWindow.open(rc.map);
                rc.elevationInfoWindow.setPosition(elevationInfoWindow.position);
                rc.elevationInfoWindow.setContent(elevationInfoWindow.message);
            } else {
                rc.elevationInfoWindow.close();
            }
        }
    }, [elevationInfoWindow]);
    useEffect(() => {
        if (!rc.map) return;
        const c = rc.map.getCenter().toJSON();
        if (rc.center.lon !== c.lon || rc.center.lng !== c.lng) rc.map.setCenter(rc.center);
    }, [rc.center]);
    useEffect(() => {
        if (!rc.map) return;
        rc.marker.position = { lat: geoMarker.lat, lng: geoMarker.lng };
        rc.marker.map = geoMarker.show ? rc.map : null;
    }, [geoMarker]);
    useEffect(() => {
        if (!mapLoaded) return;
        if (rc.selectedPath &&
            rc.selectedPath !== rc.pathManager.getEncodedSelection()) {
            rc.pathManager.showPath(rc.selectedPath, true);
        }
    }, [rc.selectedPath, mapLoaded]);
    useEffect(() => {
        if (!mapLoaded) return;
        clearPaths(true);
        addPaths(rows);
    }, [rows, mapLoaded]);
    useEffect(() => {
        if (!mapLoaded) return;
        if (selectedItem &&
             selectedItem.path !== rc.pathManager.getEncodedCurrent()) {
            rc.pathManager.showPath(selectedItem.path, false, true, selectedItem);
        } else if (!selectedItem) {
            rc.pathManager.set('current', null);
        }
    }, [selectedItem, mapLoaded]);
    useEffect(() => {
        if (!mapLoaded) return;
        if (pathEditable) {
            rc.pathManager.set('editable', true);
        }
    }, [pathEditable, rc.selectedPath]);

    useEffect(() => {
        if (!mapLoaded) return;
        if (['neighborhood', 'start', 'end'].includes(rc.filter)) {
            const showDistanceWidget = !!rc.distanceWidget.getMap();
            rc.distanceWidget.setMap(rc.map);
            rc.distanceWidget.set('radius', parseFloat(radius));
            if (!showDistanceWidget) {
                const center = { lat: latitude, lng: longitude };
                rc.distanceWidget.setCenter(center);
            }
        } else {
            rc.distanceWidget.setMap(null);
        }
    }, [rc.filter, radius, latitude, longitude, mapLoaded]);

    useEffect(() => {
        if (!mapLoaded) return;
        (async () => {
            if (rc.filter === 'cities' && citiesChanges() && !rc.fetching) {
                rc.polygonManager.deleteAll();
                if (rc.cities) {
                    rc.fetching = true;
                    try {
                        const response = await fetch(`/api/cities?jcodes=${rc.cities}`);
                        const cities = await response.json();
                        cities.forEach((city) => {
                            rc.polygonManager.addPolygon(city.jcode, city.theGeom);
                        });
                    } catch (error) {
                        window.alert(error);
                    }
                    rc.fetching = false;
                }
            }
            if (rc.filter === 'cities') {
                rc.polygonManager.showAll();
            } else {
                rc.polygonManager.hideAll();
            }
        })();
    }, [rc.filter, rc.cities, mapLoaded]);

    return (
        <>
            <Box
                ref={mapElemRef}
                sx={{
                    my: 0,
                }}
                {... props}
            />
            <a ref={downloadRef} style={{ display: 'none' }} download="walklog.json" href="#dummy">download</a>
            <input ref={uploadRef} type="file" style={{ display: 'none' }} />
            <ConfirmModal
                {...APPEND_PATH_CONFIRM_INFO}
                open={confirmInfo.open}
                resolve={confirmInfo.resolve}
            />
        </>
    );
};

export default Map;
