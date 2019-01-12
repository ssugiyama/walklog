import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { setPanoramaCount, setPanoramaIndex, setOverlay, setGeoMarker,
    setEditingPath, deleteSelectedPath, setSearchForm, openSnackbar, } from './actions';
import Tooltip from '@material-ui/core/Tooltip';
import IconButton from '@material-ui/core/IconButton';
import Select from '@material-ui/core/Select';
import Fab from '@material-ui/core/Fab';
import MenuItem from '@material-ui/core/MenuItem';
import EditorModeEdit from '@material-ui/icons/Edit';
import ActionDelete from '@material-ui/icons/Remove';
import NavigationRefresh from '@material-ui/icons/Block';
import NavigationCancel from '@material-ui/icons/Cancel';
import ActionSwapVert from '@material-ui/icons/SwapVert';
import NavigationArrowForward from '@material-ui/icons/ArrowForward';
import NavigationArrowBack from '@material-ui/icons/ArrowBack';
import AvFastForward from '@material-ui/icons/FastForward';
import AvFastRewind from '@material-ui/icons/FastRewind';
import FileDownload from '@material-ui/icons/GetApp';
import FileUpload from '@material-ui/icons/Publish';
import SwapHoriz from '@material-ui/icons/SwapHoriz';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import SearchIcon from '@material-ui/icons/Search';
import { fade } from '@material-ui/core/styles/colorManipulator';
import InputBase from '@material-ui/core/InputBase';
import MapContext from './map-context';
import SwipeableViews from 'react-swipeable-views';

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
    fabButton: {
        position: 'absolute',
        zIndex: 10,
        top: -20,
        left: 0,
        right: 0,
        margin: '0 auto',
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

class BottomBar extends Component {
    constructor(props) {
        super(props);
        this.state = {length: 0, location: '', groupIndex: 0 };
    }
    static computeLength(selected_path) {
        if (selected_path) {
            return google.maps.geometry.spherical.computeLength(google.maps.geometry.encoding.decodePath(selected_path))/1000;
        }
        else {
            return 0;
        }
    }
    static getDerivedStateFromProps(nextProps, prevState) {
        return { length:  BottomBar.computeLength(nextProps.selected_path)};
    }
    handleIndexChange(groupIndex) {
        this.setState({groupIndex});
    }
    handleNextButtonClick() {
        const groupCount = this.props.overlay ? 1 : this.props.filter == '' ? 2 : 3;
        const groupIndex = this.state.groupIndex < groupCount - 1 ? this.state.groupIndex + 1 : 0;
        this.setState({groupIndex});
    }
    handleSelectFilter(event) {
        this.props.setSearchForm({filter: event.target.value});
    }
    resetCities() {
        this.props.setSearchForm({cities: ''});
    }
    handleSelectRadius(event) {
        this.props.setSearchForm({radius: event.target.value});
    }
    handleSubmitLocation() {
        if (!this.state.location) return;
        this.geocoder.geocode( { 'address': this.state.location}, (results, status) =>  {
            if (status == google.maps.GeocoderStatus.OK) {
                this.props.setGeoMarker({ 
                    lat: results[0].geometry.location.lat(),
                    lng: results[0].geometry.location.lng(),
                    show: true
                }, true);
            } else {
                alert('Geocode was not successful for the following reason: ' + status);
            }
        });
    }
    componentDidUpdate(prevProps, prevSate) {
        if ( this.props.map_loaded && !this.geocoder) {
            this.geocoder = new google.maps.Geocoder();
        }
    }
    render() {
        const classes = this.props.classes;
        const OverlayControls = (<div>
            <div className={classes.bottomBarGroup}>
                <Typography variant="caption">StreetView</Typography>
                <div className={classes.bottomBarGroupBody}>
                    <Tooltip title="back to map" position="top-center">
                        <IconButton onClick={ () => { this.props.setOverlay(false); }}><NavigationCancel /></IconButton>
                    </Tooltip>
                    <Tooltip title="-10" position="top-center">
                        <IconButton onClick={ () => { this.props.setPanoramaIndex(this.props.panorama_index - 10); } }><AvFastRewind /></IconButton>
                    </Tooltip>
                    <Tooltip title="-1" position="top-center">
                        <IconButton onClick={ () => { this.props.setPanoramaIndex(this.props.panorama_index - 1); }}><NavigationArrowBack /></IconButton>
                    </Tooltip>
                    <Typography variant="body1" style={{ display: 'inline' }}>{ this.props.panorama_index+1 } / { this.props.panorama_count } </Typography>
                    <Tooltip title="+1" position="top-center">
                        <IconButton onClick={ () => { this.props.setPanoramaIndex(this.props.panorama_index + 1); }}><NavigationArrowForward /></IconButton>
                    </Tooltip>
                    <Tooltip title="+10" position="top-center">
                        <IconButton onClick={ () => { this.props.setPanoramaIndex(this.props.panorama_index + 10); }}><AvFastForward /></IconButton>
                    </Tooltip>
                </div>
            </div>
        </div>);
        const FilterControls = (<div>
            <div className={classes.bottomBarGroup}>
                <Typography variant="caption">Filter</Typography>
                <div className={classes.bottomBarGroupBody}>
                    <Select value={this.props.filter} onChange={this.handleSelectFilter.bind(this)}>
                        <MenuItem value="">-</MenuItem>
                        <MenuItem value="neighborhood">Neighborhood</MenuItem>
                        <MenuItem value="cities">Cities</MenuItem>
                        <MenuItem value="frechet">Fréchet</MenuItem>
                        <MenuItem value="hausdorff">Hausdorff</MenuItem>
                        <MenuItem value="crossing">Crossing</MenuItem>
                    </Select>
                    { this.props.filter == 'neighborhood' &&
                    <Select value={this.props.radius} onChange={this.handleSelectRadius.bind(this)}>
                        <MenuItem value={1000}>1km</MenuItem>
                        <MenuItem value={500}>500m</MenuItem>
                        <MenuItem value={250}>250m</MenuItem>
                        <MenuItem value={100}>100m</MenuItem>
                        {
                            [1000, 500, 250, 100].some(r => r == this.props.radius) ? null
                            : (<MenuItem value={this.props.radius}>{Math.round(this.props.radius) + 'm'}</MenuItem>)
                        }
                    </Select>}
                    { this.props.filter == 'cities' &&
                    <Tooltip title="clear" position="top-center">
                        <IconButton onClick={this.resetCities.bind(this)}><NavigationRefresh /></IconButton>
                    </Tooltip>}
                </div>
            </div>
        </div>);
        const PathControls = (<div>
            <div className={classes.bottomBarGroup}>
                <Typography variant="caption">Path</Typography>
                <div className={classes.bottomBarGroupBody}>
                    <Tooltip title="edit" position="top-center">
                        <IconButton onClick={() => this.props.setEditingPath(true) } disabled={! this.props.selected_path} ><EditorModeEdit /></IconButton>
                    </Tooltip>
                    <Tooltip title="clear all" position="top-center">
                        <IconButton onClick={() => this.context.clearPaths() }><NavigationRefresh /></IconButton>
                    </Tooltip>
                    <Tooltip title="download" position="top-center">
                        <IconButton onClick={() => this.context.downloadPath() }  disabled={! this.props.selected_path}><FileDownload /></IconButton>
                    </Tooltip>
                    <Tooltip title="upload" position="top-center">
                        <IconButton onClick={() => this.context.uploadPath() }><FileUpload /></IconButton>
                    </Tooltip>
                    <Typography variant="body1" style={{ display: 'inline' }}>{`${this.state.length.toFixed(1)}km`}</Typography>
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
                            onChange={e => this.setState({location: e.target.value})}
                            onKeyPress={e => { if (e.charCode == 13) this.handleSubmitLocation(); }}
                            onBlur={e => { this.handleSubmitLocation(); }}
                        />
                    </div>
                </div>
            </div>
        </div>);
        const controls = [];
        if (this.props.overlay) {
            controls.push(OverlayControls);
        }
        else {
            if (this.props.filter != '') {
                controls.push(FilterControls);
            }
            controls.push(PathControls);
            controls.push(SearchControls)
        }
        return (
            <Toolbar className={classes.root}>
                <Fab size="small" aria-label="swipe buttons" 
                    color="secondary"
                    disabled={this.props.overlay}
                    className={classes.fabButton} 
                    onClick={this.handleNextButtonClick.bind(this)} >
                    <SwapHoriz />
                </Fab>
                <SwipeableViews style={{width : '100%'}} index={this.state.groupIndex} onChangeIndex={this.handleIndexChange.bind(this)} disableLazyLoading enableMouseEvents>
                    {controls}
                </SwipeableViews>
            </Toolbar>
        );
    }
}

BottomBar.contextType = MapContext;

function mapStateToProps(state) {
    const { filter, radius } = state.main.search_form;
    const { selected_path, panorama, panorama_index, panorama_count, overlay, map_loaded } = state.main;
    return {
        filter, radius, selected_path, panorama, panorama_index, panorama_count, overlay, map_loaded
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ 
        setPanoramaCount, 
        setPanoramaIndex, 
        setOverlay,
        setEditingPath, 
        deleteSelectedPath,
        setSearchForm,
        setGeoMarker
    }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(BottomBar));
