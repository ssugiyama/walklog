import React, { useEffect, useRef, useState, useMemo, useContext, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setGeoMarker, setPathEditable, setAutoGeolocation, setCustomStyle } from '../features/map';
import EditorModeEdit from '@mui/icons-material/Edit';
import NavigationRefresh from '@mui/icons-material/Block';
import FileDownload from '@mui/icons-material/GetApp';
import FileUpload from '@mui/icons-material/Publish';
import SearchIcon from '@mui/icons-material/Search';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import Circle from '@mui/icons-material/Circle';
import Straighten from '@mui/icons-material/Straighten';
import MapContext from './utils/map-context';
import { openSnackbar, openToolBox } from '../features/view';
import ConfirmModal from './confirm-modal';
import {APPEND_PATH_CONFIRM_INFO} from './confirm-modal';
import { TextField, SwipeableDrawer, Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText, ListSubheader, IconButton } from '@mui/material';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';

const AUTO_GEOLOCATION_INTERVAL = 60000;

const ToolBox = props => {
    const selectedPath  = useSelector(state => state.map.selectedPath);
    const mapLoaded     = useSelector(state => state.map.mapLoaded);
    const autoGeolocation = useSelector(state => state.map.autoGeolocation);
    const customStyle = useSelector(state => state.map.customStyle);
    const dispatch      = useDispatch();
    const [location, setLocation] = useState('');
    const context = useContext(MapContext);
    const { downloadPath, uploadPath, clearPaths } = context.state;
    const refs = useRef({});
    const length  = useMemo(() => {
        if (selectedPath) {
            return google.maps.geometry.spherical.computeLength(google.maps.geometry.encoding.decodePath(selectedPath))/1000;
        }
        else {
            return 0;
        }
    }, [selectedPath]);

    useEffect(() => {
        if (mapLoaded) {
            refs.current.geocoder = new google.maps.Geocoder();
        }
    }, [mapLoaded]);

    const [confirmInfo, setConfirmInfo] = useState({open: false});
    const { addPoint } = context.state;
    const showMarker = (pos, updateCenter) => {
        const geoMarker = { lat: pos.coords.latitude, lng: pos.coords.longitude, show: true, updateCenter };
        dispatch(setGeoMarker(geoMarker));
    };
    const addCurrentPosition = (pos, append) => {
        setConfirmInfo({open: false});
        addPoint(pos.coords.latitude, pos.coords.longitude, append);
    };
    const getCurrentPosition = (onSuccess, onFailure) => {
        navigator.geolocation.getCurrentPosition( pos => {
            onSuccess(pos);
        }, () => {
            if (onFailure) onFailure();
        });
    };
    useEffect(() => {
        if (autoGeolocation) {
            const intervalId = setInterval(() => {
                getCurrentPosition(pos => {
                    addCurrentPosition(pos, true);
                });
            }, AUTO_GEOLOCATION_INTERVAL);
            return () => {
                clearInterval(intervalId);
            };
        }
    }, [autoGeolocation]);
    const toggleRecordCB = useCallback(() => {
        if (!autoGeolocation && navigator.geolocation) {
            getCurrentPosition(async pos => {
                dispatch(openSnackbar('start following your location'));
                const append = await new Promise((resolve) => {
                    if (selectedPath) {
                        setConfirmInfo({open: true, resolve});
                    }
                    else {
                        resolve(false);
                    }
                });
                addCurrentPosition(pos, append);
            }, () => {
                alert('Unable to retrieve your location');
            });
        } else if (!autoGeolocation) {
            alert('Geolocation is not supported by your browser');
        } else {
            dispatch(openSnackbar('stop following your location'));
        }
        dispatch(setAutoGeolocation(!autoGeolocation));
    });
    const currentLocationCB = useCallback(() => {
        if (navigator.geolocation) {
            getCurrentPosition(async pos => {
                showMarker(pos, true);
            }, () => {
                alert('Unable to retrieve your location');
            });
        }
    });

    const locationChangeCB = useCallback(e => setLocation(e.target.value));
    const submitLocationCB = useCallback(e => {
        if (!location) return;
        if (e.charCode && e.charCode != 13) return;
        refs.current.geocoder.geocode( { 'address': location}, (results, status) =>  {
            if (status == google.maps.GeocoderStatus.OK) {
                dispatch(setGeoMarker({
                    lat: results[0].geometry.location.lat(),
                    lng: results[0].geometry.location.lng(),
                    show: true,
                    updateCenter: true,
                }));
            } else {
                alert('Geocode was not successful for the following reason: ' + status);
            }
        });
    }, [location]);

    const toggleCustomStyleChange = (e) => {
        dispatch(setCustomStyle(!customStyle));
    };
    return (
        <SwipeableDrawer variant="persistent" anchor="left"
            onOpen={() => dispatch(openToolBox(true))}
            onClose={() => dispatch(openToolBox(false))}
            {... props}>
            <List dense
                subheader={
                    <ListSubheader>
                        path
                    </ListSubheader>
                }
            >
                <ListItem>
                    <ListItemButton onClick={() => dispatch(setPathEditable(true))} disabled={!selectedPath} disableGutters dense>
                        <ListItemIcon>
                            <EditorModeEdit />
                        </ListItemIcon>
                        <ListItemText primary="edit" />
                    </ListItemButton>
                </ListItem>
                <ListItem>
                    <ListItemButton onClick={() => clearPaths()} disableGutters dense>
                        <ListItemIcon>
                            <NavigationRefresh />
                        </ListItemIcon>
                        <ListItemText primary="clear" />
                    </ListItemButton>
                </ListItem>
                <ListItem>
                    <ListItemButton onClick={() => downloadPath()} disabled={!selectedPath} disableGutters dense>
                        <ListItemIcon>
                            <FileDownload />
                        </ListItemIcon>
                        <ListItemText primary="download" />
                    </ListItemButton>
                </ListItem>
                <ListItem>
                    <ListItemButton onClick={() => uploadPath()} disableGutters dense>
                        <ListItemIcon>
                            <FileUpload />
                        </ListItemIcon>
                        <ListItemText primary="upload" />
                    </ListItemButton>
                </ListItem>
                <ListItem>
                    <ListItemButton onClick={toggleRecordCB} disableGutters dense>
                        <ListItemIcon sx={{color: autoGeolocation ? 'warning.main' : ''}}>
                            <Circle />
                        </ListItemIcon>
                        <ListItemText primary="record" />
                    </ListItemButton>
                </ListItem>
                <ListItem>
                    <ListItemIcon><Straighten /></ListItemIcon>
                    <ListItemText primary={`${length.toFixed(1)}km`} />
                </ListItem>
            </List>
            <Divider />
            <List dense
                subheader={
                    <ListSubheader>
                        move
                    </ListSubheader>
                }
            >
                <ListItem>
                    <ListItemIcon>
                        <SearchIcon />
                    </ListItemIcon>
                    <TextField
                        placeholder="location..."
                        variant="standard"
                        onChange={locationChangeCB}
                        onBlur={submitLocationCB}
                        onKeyPress={submitLocationCB}
                    />
                </ListItem>
                <ListItem>
                    <ListItemButton onClick={currentLocationCB} disableGutters dense>
                        <ListItemIcon>
                            <MyLocationIcon />
                        </ListItemIcon>
                        <ListItemText primary="here" />
                    </ListItemButton>
                </ListItem>
            </List>
            <Divider />
            <List dense
                subheader={
                    <ListSubheader>
                        style
                    </ListSubheader>
            }>
                <ListItem>
                    <ListItemButton onClick={toggleCustomStyleChange} disableGutters dense>
                        <ListItemIcon>
                            {customStyle ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
                        </ListItemIcon>
                        <ListItemText primary="custom" />
                    </ListItemButton>
                </ListItem>
            </List>
            <ConfirmModal {...APPEND_PATH_CONFIRM_INFO} open={confirmInfo.open} resolve={confirmInfo.resolve} />
        </SwipeableDrawer>
    );
};

export default ToolBox;
