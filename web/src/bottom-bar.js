import React, { useEffect, useRef, useState, useMemo, useContext, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setPanoramaIndex, setOverlay, setGeoMarker, setEditingPath, setSearchForm  } from './actions';
import Tooltip from '@material-ui/core/Tooltip';
import IconButton from '@material-ui/core/IconButton';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import EditorModeEdit from '@material-ui/icons/Edit';
import NavigationRefresh from '@material-ui/icons/Block';
import NavigationCancel from '@material-ui/icons/Cancel';
import NavigationArrowForward from '@material-ui/icons/ArrowForward';
import NavigationArrowBack from '@material-ui/icons/ArrowBack';
import AvFastForward from '@material-ui/icons/FastForward';
import AvFastRewind from '@material-ui/icons/FastRewind';
import FileDownload from '@material-ui/icons/GetApp';
import FileUpload from '@material-ui/icons/Publish';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/styles';
import SearchIcon from '@material-ui/icons/Search';
import { fade } from '@material-ui/core/styles/colorManipulator';
import InputBase from '@material-ui/core/InputBase';
import MapContext from './map-context';
import SwipeableViews from 'react-swipeable-views';
import NavigateBefore from '@material-ui/icons/NavigateBefore';
import NavigateNext from '@material-ui/icons/NavigateNext';

const styles = theme => ({
    root: {
        width: '100%',
        backgroundColor: theme.palette.background.paper,
    },
    bottomBarGroup: {
        width: '100%',
        margin: 'auto',
    },
    bottomBarGroupBody: {
        width: 'fit-content',
        margin: 'auto',
    },
    search: {
        position: 'relative',
        borderRadius: theme.shape.borderRadius,
        backgroundColor: fade(theme.palette.common.white, 0.15),
        '&:hover': {
            backgroundColor: fade(theme.palette.common.white, 0.25),
        },
        marginRight: theme.spacing(2),
        marginLeft: 0,
        width: '100%',
        [theme.breakpoints.up('sm')]: {
            marginLeft: theme.spacing(3),
            width: 'auto',
        },
    },
    searchIcon: {
        width: theme.spacing(9),
        height: '100%',
        position: 'absolute',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.palette.getContrastText(theme.palette.background.default),
    },
    inputRoot: {
        width: '100%',
    },
    inputInput: {
        paddingTop: theme.spacing(1),
        paddingRight: theme.spacing(1),
        paddingBottom: theme.spacing(1),
        paddingLeft: theme.spacing(10),
        transition: theme.transitions.create('width'),
        width: '100%',
        [theme.breakpoints.up('md')]: {
            width: 200,
        },
    },
    swipeableViews: {
        width: '100%',
    },
    inline: {
        display: 'inline',
    },
});

const useStyles = makeStyles(styles);

const BottomBar = props => {
    const filter        = useSelector(state => state.main.searchForm.filter);
    const radius        = useSelector(state => state.main.searchForm.radius);
    const selectedPath  = useSelector(state => state.main.selectedPath);
    const panoramaIndex = useSelector(state => state.main.panoramaIndex);
    const panoramaCount = useSelector(state => state.main.panoramaCount);
    const overlay       = useSelector(state => state.main.overlay);
    const mapLoaded     = useSelector(state => state.main.mapLoaded);
    const dispatch      = useDispatch();
    const [location, setLocation] = useState('');
    const [groupIndex, setGroupIndex] = useState(0);
    const classes = useStyles(props);
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
    const OverlayControls = (<div key="overlay">
        <div className={classes.bottomBarGroup}>
            <Typography variant="caption">StreetView</Typography>
            <div className={classes.bottomBarGroupBody}>
                <Tooltip title="back to map" position="top-center">
                    <IconButton onClick={overlayButtonClickCB}><NavigationCancel /></IconButton>
                </Tooltip>
                <Tooltip title="-10" position="top-center">
                    <IconButton onClick={panoramaIndexButtonClickCBs['-10'] }><AvFastRewind /></IconButton>
                </Tooltip>
                <Tooltip title="-1" position="top-center">
                    <IconButton onClick={panoramaIndexButtonClickCBs['-1']}><NavigationArrowBack /></IconButton>
                </Tooltip>
                <Typography variant="body1" className={classes.inline}>{ panoramaIndex+1 } / { panoramaCount } </Typography>
                <Tooltip title="+1" position="top-center">
                    <IconButton onClick={panoramaIndexButtonClickCBs['+1']}><NavigationArrowForward /></IconButton>
                </Tooltip>
                <Tooltip title="+10" position="top-center">
                    <IconButton onClick={panoramaIndexButtonClickCBs['+10']}><AvFastForward /></IconButton>
                </Tooltip>
            </div>
        </div>
    </div>);

    const searchFormChangeCBs = {
        'filter': useCallback(e =>  dispatch(setSearchForm({filter: e.target.value})), []),
        'radius': useCallback(e =>  dispatch(setSearchForm({radius: e.target.value})), []),
        'cities': useCallback(() => dispatch(setSearchForm({cities: ''})), []),
    };
    const FilterControls = (<div key="filter">
        <div className={classes.bottomBarGroup}>
            <Typography variant="caption">Filter</Typography>
            <div className={classes.bottomBarGroupBody}>
                <Select value={filter} onChange={searchFormChangeCBs['filter']}>
                    <MenuItem value="">-</MenuItem>
                    <MenuItem value="neighborhood">Neighborhood</MenuItem>
                    <MenuItem value="cities">Cities</MenuItem>
                    <MenuItem value="frechet">Fréchet</MenuItem>
                    <MenuItem value="hausdorff">Hausdorff</MenuItem>
                    <MenuItem value="crossing">Crossing</MenuItem>
                </Select>
                { filter == 'neighborhood' &&
                <Select value={radius} onChange={searchFormChangeCBs['radius']}>
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
                    <IconButton onClick={searchFormChangeCBs['cities']}><NavigationRefresh /></IconButton>
                </Tooltip>}
            </div>
        </div>
    </div>);

    const editButtonClickCB = useCallback(() => dispatch(setEditingPath(true)));
    const clearButtonClickCB = useCallback(() => clearPaths(), [mapLoaded]);
    const downloadButtonClickCB = useCallback(() => downloadPath(), [mapLoaded]);
    const uploadButtonClickCB = useCallback(() => uploadPath(), [mapLoaded]);
    const PathControls = (<div key="path">
        <div className={classes.bottomBarGroup}>
            <Typography variant="caption">Path</Typography>
            <div className={classes.bottomBarGroupBody}>
                <Tooltip title="edit" position="top-center">
                    <IconButton onClick={editButtonClickCB} disabled={! selectedPath} ><EditorModeEdit /></IconButton>
                </Tooltip>
                <Tooltip title="clear all" position="top-center">
                    <IconButton onClick={clearButtonClickCB}><NavigationRefresh /></IconButton>
                </Tooltip>
                <Tooltip title="download" position="top-center">
                    <IconButton onClick={downloadButtonClickCB}  disabled={! selectedPath}><FileDownload /></IconButton>
                </Tooltip>
                <Tooltip title="upload" position="top-center">
                    <IconButton onClick={uploadButtonClickCB}><FileUpload /></IconButton>
                </Tooltip>
                <Typography variant="body1" className={classes.inline}>{`${length.toFixed(1)}km`}</Typography>
            </div>
        </div>
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
                    show: true
                }, true));
            } else {
                alert('Geocode was not successful for the following reason: ' + status);
            }
        });
    }, [location]);

    const SearchControls = (<div key="search">
        <div className={classes.bottomBarGroup}>
            <Typography variant="caption">Search</Typography>
            <div className={classes.bottomBarGroupBody}>
                <div className={classes.search}>
                    <div className={classes.searchIcon}>
                        <SearchIcon />
                    </div>
                    <InputBase
                        placeholder="location..."
                        classes={{
                            root: classes.inputRoot,
                            input: classes.inputInput,
                        }}
                        onChange={locationChangeCB}
                        onKeyPress={submitLocationCB}
                        onBlur={submitLocationCB}
                    />
                </div>
            </div>
        </div>
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
        <Toolbar className={classes.root} variant="dense">
            {
                groupCount > 1 && (<IconButton onClick={prevButtonClickCB}> <NavigateBefore /></IconButton>)
            }
            <SwipeableViews className={classes.swipeableViews} index={groupIndex} onChangeIndex={indexChangeCB} disableLazyLoading enableMouseEvents>
                {controls}
            </SwipeableViews>
            {
                groupCount > 1 && (<IconButton onClick={nextButtonClickCB}><NavigateNext /></IconButton>)
            }
        </Toolbar>
    );
};

export default BottomBar;
