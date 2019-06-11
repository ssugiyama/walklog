import React, { useEffect, useRef, useState, useMemo, useContext, useCallback, memo } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
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
        backgroundColor: theme.palette.background.default,
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
        marginRight: theme.spacing.unit * 2,
        marginLeft: 0,
        width: '100%',
        [theme.breakpoints.up('sm')]: {
            marginLeft: theme.spacing.unit * 3,
            width: 'auto',
        },
    },
    searchIcon: {
        width: theme.spacing.unit * 9,
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
        paddingTop: theme.spacing.unit,
        paddingRight: theme.spacing.unit,
        paddingBottom: theme.spacing.unit,
        paddingLeft: theme.spacing.unit * 10,
        transition: theme.transitions.create('width'),
        width: '100%',
        [theme.breakpoints.up('md')]: {
            width: 200,
        },
    },
});

const useStyles = makeStyles(styles);

const BottomBar = props => {
    const [location, setLocation] = useState('');
    const [groupIndex, setGroupIndex] = useState(0);
    const { filter, radius, selectedPath, panoramaIndex, panoramaCount, overlay, mapLoaded } = props;
    const { setPanoramaIndex, setOverlay, setEditingPath, setSearchForm, setGeoMarker } = props;
    const classes = useStyles(props);
    const context = useContext(MapContext);
    const { downloadPath, uploadPath, clearPaths } = context.state;
    const refs = useRef();
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
            refs.geocoder = new google.maps.Geocoder();
        }
    }, [mapLoaded]);
    const handleNextButtonClick = d => () => {
        setGroupIndex(index => {
            index = (index + d) % groupCount;
            if (index < 0) index += groupCount;
            return index;
        });
    };
    const handleSubmitLocation = useCallback(() => {
        if (!location) return;
        refs.geocoder.geocode( { 'address': location}, (results, status) =>  {
            if (status == google.maps.GeocoderStatus.OK) {
                setGeoMarker({ 
                    lat: results[0].geometry.location.lat(),
                    lng: results[0].geometry.location.lng(),
                    show: true
                }, true);
            } else {
                alert('Geocode was not successful for the following reason: ' + status);
            }
        });
    }, [location]);
    const handleSearchFormChange = useCallback((name, value) =>  {
        setSearchForm({[name]: value});
    });
    const OverlayControls = (<div>
        <div className={classes.bottomBarGroup}>
            <Typography variant="caption">StreetView</Typography>
            <div className={classes.bottomBarGroupBody}>
                <Tooltip title="back to map" position="top-center">
                    <IconButton onClick={ () => { setOverlay(false); }}><NavigationCancel /></IconButton>
                </Tooltip>
                <Tooltip title="-10" position="top-center">
                    <IconButton onClick={ () => { setPanoramaIndex(panoramaIndex - 10); } }><AvFastRewind /></IconButton>
                </Tooltip>
                <Tooltip title="-1" position="top-center">
                    <IconButton onClick={ () => { setPanoramaIndex(panoramaIndex - 1); }}><NavigationArrowBack /></IconButton>
                </Tooltip>
                <Typography variant="body1" style={{ display: 'inline' }}>{ panoramaIndex+1 } / { panoramaCount } </Typography>
                <Tooltip title="+1" position="top-center">
                    <IconButton onClick={ () => { setPanoramaIndex(panoramaIndex + 1); }}><NavigationArrowForward /></IconButton>
                </Tooltip>
                <Tooltip title="+10" position="top-center">
                    <IconButton onClick={ () => { setPanoramaIndex(panoramaIndex + 10); }}><AvFastForward /></IconButton>
                </Tooltip>
            </div>
        </div>
    </div>);
    const FilterControls = (<div>
        <div className={classes.bottomBarGroup}>
            <Typography variant="caption">Filter</Typography>
            <div className={classes.bottomBarGroupBody}>
                <Select value={filter} onChange={e => handleSearchFormChange('filter', e.target.value)}>
                    <MenuItem value="">-</MenuItem>
                    <MenuItem value="neighborhood">Neighborhood</MenuItem>
                    <MenuItem value="cities">Cities</MenuItem>
                    <MenuItem value="frechet">Fréchet</MenuItem>
                    <MenuItem value="hausdorff">Hausdorff</MenuItem>
                    <MenuItem value="crossing">Crossing</MenuItem>
                </Select>
                { filter == 'neighborhood' &&
                <Select value={radius} onChange={e => handleSearchFormChange('radius', e.target.value)}>
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
                    <IconButton onClick={() => handleSearchFormChange('cities', '')}><NavigationRefresh /></IconButton>
                </Tooltip>}
            </div>
        </div>
    </div>);
    const PathControls = (<div>
        <div className={classes.bottomBarGroup}>
            <Typography variant="caption">Path</Typography>
            <div className={classes.bottomBarGroupBody}>
                <Tooltip title="edit" position="top-center">
                    <IconButton onClick={() => setEditingPath(true) } disabled={! selectedPath} ><EditorModeEdit /></IconButton>
                </Tooltip>
                <Tooltip title="clear all" position="top-center">
                    <IconButton onClick={() => clearPaths() }><NavigationRefresh /></IconButton>
                </Tooltip>
                <Tooltip title="download" position="top-center">
                    <IconButton onClick={() => downloadPath() }  disabled={! selectedPath}><FileDownload /></IconButton>
                </Tooltip>
                <Tooltip title="upload" position="top-center">
                    <IconButton onClick={() => uploadPath() }><FileUpload /></IconButton>
                </Tooltip>
                <Typography variant="body1" style={{ display: 'inline' }}>{`${length.toFixed(1)}km`}</Typography>
            </div>
        </div>
    </div>);
    const SearchControls = (<div>
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
                        onChange={e => setLocation(e.target.value)}
                        onKeyPress={e => { if (e.charCode == 13) handleSubmitLocation(); }}
                        onBlur={() => { handleSubmitLocation(); }}
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
    return (
        <Toolbar className={classes.root}>
            {
                groupCount > 1 && (<IconButton onClick={handleNextButtonClick(-1)}> <NavigateBefore /></IconButton>)
            }
            <SwipeableViews style={{width : '100%'}} index={groupIndex} onChangeIndex={index => setGroupIndex(index)} disableLazyLoading enableMouseEvents>
                {controls}
            </SwipeableViews>
            {
                groupCount > 1 && (<IconButton onClick={handleNextButtonClick(1)}><NavigateNext /></IconButton>)
            }
        </Toolbar>
    );
};

function mapStateToProps(state) {
    const { filter, radius } = state.main.searchForm;
    const { selectedPath, panoramaIndex, panoramaCount, overlay, mapLoaded } = state.main;
    return {
        filter, radius, selectedPath, panoramaIndex, panoramaCount, overlay, mapLoaded
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({
        setPanoramaIndex, 
        setOverlay,
        setEditingPath, 
        setSearchForm,
        setGeoMarker
    }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(memo(BottomBar));
