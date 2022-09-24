import React, { useEffect, useRef, useState, useMemo, useContext, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setSearchForm } from '../features/search-form';
import { setGeoMarker, setPathEditable } from '../features/map';
import { setPanoramaIndex } from '../features/panorama';
import { setOverlay } from '../features/view';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import EditorModeEdit from '@mui/icons-material/Edit';
import NavigationRefresh from '@mui/icons-material/Block';
import NavigationCancel from '@mui/icons-material/Cancel';
import NavigationArrowForward from '@mui/icons-material/ArrowForward';
import NavigationArrowBack from '@mui/icons-material/ArrowBack';
import AvFastForward from '@mui/icons-material/FastForward';
import AvFastRewind from '@mui/icons-material/FastRewind';
import FileDownload from '@mui/icons-material/GetApp';
import FileUpload from '@mui/icons-material/Publish';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import { alpha } from '@mui/material/styles';
import InputBase from '@mui/material/InputBase';
import Box from '@mui/material/Box';
import MapContext from './utils/map-context';
import SwipeableViews from 'react-swipeable-views';
import NavigateBefore from '@mui/icons-material/NavigateBefore';
import NavigateNext from '@mui/icons-material/NavigateNext';

const BottomBar = props => {
    const filter        = useSelector(state => state.searchForm.filter);
    const radius        = useSelector(state => state.searchForm.radius);
    const selectedPath  = useSelector(state => state.map.selectedPath);
    const panoramaIndex = useSelector(state => state.panorama.panoramaIndex);
    const panoramaCount = useSelector(state => state.panorama.panoramaCount);
    const overlay       = useSelector(state => state.view.overlay);
    const mapLoaded     = useSelector(state => state.map.mapLoaded);
    const dispatch      = useDispatch();
    const [location, setLocation] = useState('');
    const [groupIndex, setGroupIndex] = useState(0);
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
    const groupCount = useMemo(() => overlay ? 1 : 3, [overlay]);
    useEffect(() => {
        if (mapLoaded) {
            refs.current.geocoder = new google.maps.Geocoder();
        }
    }, [mapLoaded]);

    const createPanoramaIndexButtonClickCB = d => () => dispatch(setPanoramaIndex(panoramaIndex + d));
    const panoramaIndexButtonClickCBs = {
        '-10': useCallback(createPanoramaIndexButtonClickCB(-10), [panoramaIndex]),
        '-1':  useCallback(createPanoramaIndexButtonClickCB(-1), [panoramaIndex]),
        '+1':  useCallback(createPanoramaIndexButtonClickCB(1), [panoramaIndex]),
        '+10': useCallback(createPanoramaIndexButtonClickCB(10), [panoramaIndex]),
    };
    const overlayButtonClickCB = useCallback(() => dispatch(setOverlay(false)), []);
    const sxBottomBarGroup = {
        width: '100%',
        margin: 'auto',
    };
    const sxBottomBarGroupBody = {
        width: 'fit-content',
        margin: 'auto',
    };
    const OverlayControls = (<div key="overlay">
        <Box sx={sxBottomBarGroup}>
            <Typography variant="caption">StreetView</Typography>
            <Box sx={sxBottomBarGroupBody}>
                <Tooltip title="back to map" position="top-center">
                    <IconButton onClick={overlayButtonClickCB} size="large"><NavigationCancel /></IconButton>
                </Tooltip>
                <Tooltip title="-10" position="top-center">
                    <IconButton onClick={panoramaIndexButtonClickCBs['-10'] } size="large"><AvFastRewind /></IconButton>
                </Tooltip>
                <Tooltip title="-1" position="top-center">
                    <IconButton onClick={panoramaIndexButtonClickCBs['-1']} size="large"><NavigationArrowBack /></IconButton>
                </Tooltip>
                <Typography variant="body1" sx={{display: 'inline'}}>{ panoramaIndex+1 } / { panoramaCount } </Typography>
                <Tooltip title="+1" position="top-center">
                    <IconButton onClick={panoramaIndexButtonClickCBs['+1']} size="large"><NavigationArrowForward /></IconButton>
                </Tooltip>
                <Tooltip title="+10" position="top-center">
                    <IconButton onClick={panoramaIndexButtonClickCBs['+10']} size="large"><AvFastForward /></IconButton>
                </Tooltip>
            </Box>
        </Box>
    </div>);

    const searchFormChangeCBs = {
        'filter': useCallback(e =>  dispatch(setSearchForm({filter: e.target.value})), []),
        'radius': useCallback(e =>  dispatch(setSearchForm({radius: e.target.value})), []),
        'cities': useCallback(() => dispatch(setSearchForm({cities: ''})), []),
    };
    const FilterControls = (<div key="filter">
        <Box sx={sxBottomBarGroup}>
            <Typography variant="caption">Filter</Typography>
            <Box sx={sxBottomBarGroupBody}>
                <Select value={filter} onChange={searchFormChangeCBs['filter']} variant="standard">
                    <MenuItem value="">-</MenuItem>
                    <MenuItem value="neighborhood">Neighborhood</MenuItem>
                    <MenuItem value="cities">Cities</MenuItem>
                    <MenuItem value="frechet">Fréchet</MenuItem>
                    <MenuItem value="hausdorff">Hausdorff</MenuItem>
                    <MenuItem value="crossing">Crossing</MenuItem>
                </Select>
                { filter == 'neighborhood' &&
                <Select value={radius} onChange={searchFormChangeCBs['radius']} variant="standard">
                    <MenuItem value={1000}>1km</MenuItem>
                    <MenuItem value={500}>500m</MenuItem>
                    <MenuItem value={250}>250m</MenuItem>
                    <MenuItem value={100}>100m</MenuItem>
                    {
                        [1000, 500, 250, 100].some(r => r == radius) ? null
                            : (<MenuItem value={radius}>{Math.round(radius) + 'm'}</MenuItem>)
                    }
                </Select>}
                { filter == 'cities' &&
                <Tooltip title="clear" position="top-center">
                    <IconButton onClick={searchFormChangeCBs['cities']} size="large"><NavigationRefresh /></IconButton>
                </Tooltip>}
            </Box>
        </Box>
    </div>);

    const editButtonClickCB = useCallback(() => dispatch(setPathEditable(true)));
    const clearButtonClickCB = useCallback(() => clearPaths(), [mapLoaded]);
    const downloadButtonClickCB = useCallback(() => downloadPath(), [mapLoaded]);
    const uploadButtonClickCB = useCallback(() => uploadPath(), [mapLoaded]);
    const PathControls = (<div key="path">
        <Box sx={sxBottomBarGroup}>
            <Typography variant="caption">Path</Typography>
            <Box sx={sxBottomBarGroupBody}>
                <Tooltip title="edit" position="top-center">
                    <IconButton onClick={editButtonClickCB} disabled={! selectedPath} size="large"><EditorModeEdit /></IconButton>
                </Tooltip>
                <Tooltip title="clear all" position="top-center">
                    <IconButton onClick={clearButtonClickCB} size="large"><NavigationRefresh /></IconButton>
                </Tooltip>
                <Tooltip title="download" position="top-center">
                    <IconButton onClick={downloadButtonClickCB} disabled={! selectedPath} size="large"><FileDownload /></IconButton>
                </Tooltip>
                <Tooltip title="upload" position="top-center">
                    <IconButton onClick={uploadButtonClickCB} size="large"><FileUpload /></IconButton>
                </Tooltip>
                <Typography variant="body1" sx={{display: 'inline'}}>{`${length.toFixed(1)}km`}</Typography>
            </Box>
        </Box>
    </div>);

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
    const sxSearchIcon = {
        width: theme => theme.spacing(9),
        height: '100%',
        position: 'absolute',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme => theme.palette.getContrastText(theme.palette.background.default),
    };
    const sxSearchBox = {
        position: 'relative',
        borderRadius: 2,
        backgroundColor: theme => alpha(theme.palette.common.white, 0.15),
        '&:hover': {
            backgroundColor: theme => alpha(theme.palette.common.white, 0.25),
        },
        marginRight: 2,
        marginLeft: [0, 1],
        width: ['100%', 'auto'],
    };

    const sxInputBase = {
        width: '100%',
        '& .MuiInputBase-input': {
            paddingTop: 1,
            paddingRight: 1,
            paddingBottom: 1,
            paddingLeft: 10,
            transition: theme => theme.transitions.create('width'),
            width: ['100%', '100%', 200],
        },
    };

    const SearchControls = (<div key="search">
        <Box sx={sxBottomBarGroup} data-testid="BottomBar">
            <Typography variant="caption">Search</Typography>
            <Box sx={sxBottomBarGroupBody}>
                <Box sx={sxSearchBox}>
                    <Box sx={sxSearchIcon}>
                        <SearchIcon />
                    </Box>
                    <InputBase
                        sx={sxInputBase}
                        placeholder="location..."
                        onChange={locationChangeCB}
                        onKeyPress={submitLocationCB}
                        onBlur={submitLocationCB}
                    />
                </Box>
            </Box>
        </Box>
    </div>);

    const controls = [];
    if (overlay) {
        controls.push(OverlayControls);
    }
    else {
        controls.push(FilterControls);
        controls.push(PathControls);
        controls.push(SearchControls);
    }
    const createNnextButtonClickCB = d => () => {
        setGroupIndex(index => {
            index = (index + d) % groupCount;
            if (index < 0) index += groupCount;
            return index;
        });
    };
    const nextButtonClickCB = useCallback(createNnextButtonClickCB(1));
    const prevButtonClickCB = useCallback(createNnextButtonClickCB(-1));
    const indexChangeCB = useCallback(index => setGroupIndex(index));
    return (
        <Toolbar sx={{width: '100%', backgroundColor: 'background.paper',}} variant="dense">
            {
                groupCount > 1 && (<IconButton onClick={prevButtonClickCB} size="large"> <NavigateBefore /></IconButton>)
            }
            <SwipeableViews style={{width: '100%'}} index={groupIndex} onChangeIndex={indexChangeCB} disableLazyLoading enableMouseEvents>
                {controls}
            </SwipeableViews>
            {
                groupCount > 1 && (<IconButton onClick={nextButtonClickCB} size="large"><NavigateNext /></IconButton>)
            }
        </Toolbar>
    );
};

export default BottomBar;
