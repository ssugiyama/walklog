import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { setPanoramaCount, setPanoramaIndex, setOverlay, setGeoMarker,
    setEditingPath, deleteSelectedPath, setSearchForm, } from './actions';
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
import MapsMap from '@material-ui/icons/Map';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import Swiper from 'react-id-swiper';
import SearchIcon from '@material-ui/icons/Search';
import { fade } from '@material-ui/core/styles/colorManipulator';
import InputBase from '@material-ui/core/InputBase';
import MapContext from './map-context';

const styles = theme => ({
    root: {
        width: '100%',
        backgroundColor: theme.palette.background.default,
    },
    bottomBarGroup: {
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
        this.state = {length: 0, location: ''};
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
    resetCities() {
        this.props.setSearchForm({cities: ''});
    }
    handleSelectRadius(event) {
        this.props.setSearchForm({radius: event.target.value});
    }
    handleSubmitLocation() {
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
        return (
            <Toolbar className={classes.root}>
                <Fab size="small" aria-label="swipe buttons" 
                    color="secondary"
                    className={classes.fabButton} 
                    onClick={() => { this.swiper.slideNext();}} >
                    <SwapHoriz />
                </Fab>
                <Swiper loop={true}
                    ref={node => { if(node) this.swiper = node.swiper } }
                >
                { this.props.overlay ? (
                    <div>
                        <div className={classes.bottomBarGroup}>
                            <Tooltip title="-10" position="top-center">
                                <IconButton onClick={ () => { this.props.setPanoramaIndex(this.props.panorama_index - 10); } }><AvFastRewind /></IconButton>
                            </Tooltip>
                            <Tooltip title="-1" position="top-center">
                                <IconButton onClick={ () => { this.props.setPanoramaIndex(this.props.panorama_index - 1); }}><NavigationArrowBack /></IconButton>
                            </Tooltip>
                            <span><span>{ this.props.panorama_index+1 } </span> / <span>{ this.props.panorama_count } </span></span>
                            <Tooltip title="+1" position="top-center">
                                <IconButton onClick={ () => { this.props.setPanoramaIndex(this.props.panorama_index + 1); }}><NavigationArrowForward /></IconButton>
                            </Tooltip>
                            <Tooltip title="+10" position="top-center">
                                <IconButton onClick={ () => { this.props.setPanoramaIndex(this.props.panorama_index + 10); }}><AvFastForward /></IconButton>
                            </Tooltip>
                            <Tooltip title="back to map" position="top-center">
                                <IconButton onClick={ () => { this.props.setOverlay(false); }}><MapsMap /></IconButton>
                            </Tooltip>
                        </div>
                    </div>
                ) : this.props.filter == 'neighborhood' ? (
                    <div>                
                        <div className={classes.bottomBarGroup}>
                            <Typography variant="caption">Radius</Typography>
                            <Select value={this.props.radius} onChange={this.handleSelectRadius.bind(this)}>
                                <MenuItem value={1000}>1km</MenuItem>
                                <MenuItem value={500}>500m</MenuItem>
                                <MenuItem value={250}>250m</MenuItem>
                                <MenuItem value={100}>100m</MenuItem>
                                {
                                    [1000, 500, 250, 100].some(r => r == this.props.radius) ? null
                                    : (<MenuItem value={this.props.radius}>{Math.round(this.props.radius) + 'm'}</MenuItem>)
                                }
                            </Select>
                            <Tooltip title="cancel" position="top-center">
                                <IconButton onClick={() => this.props.setSearchForm({filter: ''}) }><NavigationCancel /></IconButton>
                            </Tooltip>
                        </div>
                    </div> 
                ) : this.props.filter == 'cities' ? (
                    <div>
                        <div className={classes.bottomBarGroup}>
                            <Typography variant="caption">Cities</Typography>
                            <Tooltip title="clear" position="top-center">
                                <IconButton onClick={this.resetCities.bind(this)}><NavigationRefresh /></IconButton>
                            </Tooltip>
                            <Tooltip title="cancel" position="top-center">
                                <IconButton onClick={() => this.props.setSearchForm({filter: ''}) }><NavigationCancel /></IconButton>
                            </Tooltip>
                        </div>
                    </div>
                )            
                : null
                }
                    <div>
                        <div className={classes.bottomBarGroup}>
                            <Typography variant="caption">Path</Typography>
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
                    <div>
                        <div className={classes.bottomBarGroup}>
                            <Typography variant="caption">Search</Typography>
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
                </Swiper>
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
