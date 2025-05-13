import React, {
    useEffect, useRef, useState, useMemo, useContext, useCallback,
} from 'react';
import EditorModeEdit from '@mui/icons-material/Edit';
import NavigationRefresh from '@mui/icons-material/Block';
import FileDownload from '@mui/icons-material/GetApp';
import FileUpload from '@mui/icons-material/Publish';
import SearchIcon from '@mui/icons-material/Search';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import Circle from '@mui/icons-material/Circle';
import Close from '@mui/icons-material/Close';
import Straighten from '@mui/icons-material/Straighten';
import {
    TextField,
    Drawer,
    Divider,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    ListSubheader,
    IconButton,
} from '@mui/material';
import { useMapContext } from '../utils/map-context'
import { useMainContext } from '../utils/main-context';
import ConfirmModal, { APPEND_PATH_CONFIRM_INFO } from './confirm-modal';


const AUTO_GEOLOCATION_INTERVAL = 60000;

const ToolBox = (props) => {
    const { mainState, dispatchMain } = useMainContext();
    const mapContext = useMapContext();
    const mapLoaded = !!mapContext.state.map
    const pathManager = mapContext.state.pathManager
    const selectedPath = pathManager?.getEncodedSelection() || null
    const autoGeolocation = mainState.autoGeoLocation
    const [location, setLocation] = useState('');
    const { downloadPath, uploadPath, clearPaths } = mapContext.state;
    const refs = useRef({});
    const length = pathManager?.get('length') || 0
    const { map, marker }= mapContext.state
    useEffect(() => {
        if (mapLoaded) {
            google.maps.importLibrary('geocoding').then(({}) => {
                refs.current.geocoder = new google.maps.Geocoder()
            })
        }
    }, [mapLoaded]);

    const [confirmInfo, setConfirmInfo] = useState({ open: false });
    const { addPoint } = mapContext.state;
    const showMarker = (pos) => {
        marker.position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        marker.map = map
        map.setCenter(marker.position)
    };
    const addCurrentPosition = (pos, append) => {
        setConfirmInfo({ open: false });
        addPoint(pos.coords.latitude, pos.coords.longitude, append);
    };
    const getCurrentPosition = (onSuccess, onFailure) => {
        navigator.geolocation.getCurrentPosition((pos) => {
            onSuccess(pos);
        }, () => {
            if (onFailure) onFailure();
        });
    };
    useEffect(() => {
        if (autoGeolocation) {
            const intervalId = setInterval(() => {
                getCurrentPosition((pos) => {
                    addCurrentPosition(pos, true);
                });
            }, AUTO_GEOLOCATION_INTERVAL);
            return () => {
                clearInterval(intervalId);
            };
        }
        return () => {};
    }, [autoGeolocation]);
    const toggleRecordCB = useCallback(() => {
        if (!autoGeolocation && navigator.geolocation) {
            getCurrentPosition(async (pos) => {
                dispatchMain({ type: 'OPEN_SNACKBAR', payload: 'start following your location' })
                const append = await new Promise((resolve) => {
                    if (selectedPath) {
                        setConfirmInfo({ open: true, resolve });
                    } else {
                        resolve(false);
                    }
                });
                addCurrentPosition(pos, append);
            }, () => {
                window.alert('Unable to retrieve your location');
            });
        } else if (!autoGeolocation) {
            window.alert('Geolocation is not supported by your browser');
        } else {
            dispatchMain({ type: 'OPEN_SNACKBAR', payload: 'stop following your location' });  
        }
        dispatchMain({ type: 'SET_AUTO_GEO_LOCATION', payload: !autoGeolocation });
    }, [autoGeolocation, selectedPath, dispatchMain, pathManager, addPoint]);

    const currentLocationCB = useCallback(() => {
        if (navigator.geolocation) {
            getCurrentPosition(async (pos) => {
                showMarker(pos);
            }, () => {
                window.alert('Unable to retrieve your location');
            });
        }
    });

    const locationChangeCB = useCallback((e) => setLocation(e.target.value), []);
    const submitLocationCB = useCallback((e) => {
        if (!location) return;
        if (e.charCode && e.charCode !== 13) return;
        refs.current.geocoder.geocode({ address: location }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK) {
                marker.position = { lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() };
                marker.map = map;
                map.setCenter(marker.position)
            } else {
                window.alert(`Geocode was not successful for the following reason: ${status}`);
            }
        });
    }, [location]);

    const closeButtonStyle = {
        position: 'fixed',
        left: 'calc(120px + env(safe-area-inset-left))',
        top: 0,
        zIndex: 100,
    };
    return (
        <Drawer variant="persistent" anchor="left" {... props}>
            <IconButton
                size="small"
                style={closeButtonStyle}
                onClick={() => dispatchMain({ type: 'CLOSE_TOOL_BOX' })}
            >
                <Close />
            </IconButton>
            <List
                dense
                subheader={(
                    <ListSubheader>
                        path
                    </ListSubheader>
                )}
            >
                <ListItem>
                    <ListItemButton
                        onClick={() => pathManager.set('editable', true)}
                        disabled={!selectedPath}
                        disableGutters
                        dense
                    >
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
                    <ListItemButton
                        onClick={() => downloadPath()}
                        disabled={!selectedPath}
                        disableGutters
                        dense
                    >
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
                        <ListItemIcon sx={{ color: autoGeolocation ? 'warning.main' : '' }}>
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
            <List
                dense
                subheader={(
                    <ListSubheader>
                        move
                    </ListSubheader>
                )}
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
            <ConfirmModal
                {...APPEND_PATH_CONFIRM_INFO}
                open={confirmInfo.open}
                resolve={confirmInfo.resolve}
            />
        </Drawer>
    );
};

export default ToolBox;
