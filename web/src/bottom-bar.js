import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { setPanoramaCount, setPanoramaIndex, setOverlay, 
    setEditingPath, deleteSelectedPath, clearPaths, setSearchForm, downloadPath, uploadPath } from './actions';
import Tooltip from 'material-ui/Tooltip';
import IconButton from 'material-ui/IconButton';
import Select from 'material-ui/Select';
import {MenuItem} from 'material-ui/Menu';
import EditorModeEdit from '@material-ui/icons/ModeEdit';
import ActionDelete from '@material-ui/icons/Delete';
import NavigationRefresh from '@material-ui/icons/Refresh';
import NavigationCancel from '@material-ui/icons/Cancel';
import ActionSwapVert from '@material-ui/icons/SwapVert';
import NavigationArrowForward from '@material-ui/icons/ArrowForward';
import NavigationArrowBack from '@material-ui/icons/ArrowBack';
import AvFastForward from '@material-ui/icons/FastForward';
import AvFastRewind from '@material-ui/icons/FastRewind';
import FileDownload from '@material-ui/icons/FileDownload';
import FileUpload from '@material-ui/icons/FileUpload';
import MapsMap from '@material-ui/icons/Map';
import Toolbar from 'material-ui/Toolbar';
import Typography from 'material-ui/Typography';
import { withStyles } from 'material-ui/styles';

const styles = {
    root: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#c0c0c0',
    },
    bottomBarGroup: {
        margin: 'auto',
    },
    menuList: {
        display: 'flex',
        flexDirection: 'column',
        paddingLeft: 10,
        paddingRight: 10,
        alignItems: 'left',
    },
};

class BottomBar extends Component {
    constructor(props) {
        super(props);
        this.state = {length: 0};
    }
    computeLength(selected_path) {
        if (selected_path) {
            return google.maps.geometry.spherical.computeLength(google.maps.geometry.encoding.decodePath(selected_path))/1000;
        }
        else {
            return 0;
        }
    }
    componentWillReceiveProps(nextProps) {
        this.setState({ length:  this.computeLength(nextProps.selected_path)});
    }
    resetCities() {
        this.props.setSearchForm({cities: ''});
    }
    handleSelectRadius(event) {
        this.props.setSearchForm({radius: event.target.value});
    }
    render() {
        const classes = this.props.classes;
        return (
            <Toolbar style={styles.root}>
            { this.props.overlay ? (
                <div style={styles.bottomBarGroup}>
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
            ) : this.props.filter == 'neighborhood' ? (
                <div style={styles.bottomBarGroup}>
                    <Typography variant="caption" color="inherit">Radius</Typography>
                    <Select value={this.props.radius} onChange={this.handleSelectRadius.bind(this)}

                        MenuProps={{
                            MenuListProps: {
                                className: classes.menuList,
                            }
                        }}
                    >
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
                        <IconButton onClick={() => this.props.setSearchForm({filter: 'any'}) }><NavigationCancel /></IconButton>
                    </Tooltip>
                </div>            
            ) : this.props.filter == 'cities' ? (
                <div style={styles.bottomBarGroup}>
                    <Typography variant="caption" color="inherit">Cities</Typography>
                    <Tooltip title="clear" position="top-center">
                        <IconButton onClick={this.resetCities.bind(this)}><NavigationRefresh /></IconButton>
                    </Tooltip>
                    <Tooltip title="cancel" position="top-center">
                        <IconButton onClick={() => this.props.setSearchForm({filter: 'any'}) }><NavigationCancel /></IconButton>
                    </Tooltip>
                </div>            
            )            
            : (
                <div style={styles.bottomBarGroup}>
                    <Typography variant="caption" color="inherit">Path</Typography>
                    <Tooltip title="edit" position="top-center">
                        <IconButton onClick={() => this.props.setEditingPath() } disabled={! this.props.selected_path} ><EditorModeEdit /></IconButton>
                    </Tooltip>
                    <Tooltip title="delete" position="top-center">
                        <IconButton onClick={() => this.props.deleteSelectedPath() }  disabled={! this.props.selected_path}><ActionDelete /></IconButton>
                    </Tooltip>
                    <Tooltip title="clear all" position="top-center">
                        <IconButton onClick={() => this.props.clearPaths() }><NavigationRefresh /></IconButton>
                    </Tooltip>
                    <Tooltip title="download" position="top-center">
                        <IconButton onClick={() => this.props.downloadPath() }  disabled={! this.props.selected_path}><FileDownload /></IconButton>
                    </Tooltip>
                    <Tooltip title="upload" position="top-center">
                        <IconButton onClick={() => this.props.uploadPath() }><FileUpload /></IconButton>
                    </Tooltip>
                    <span>{`${this.state.length.toFixed(1)}km`}</span>
                </div>            
            ) }
            </Toolbar>
        );
    }
}

function mapStateToProps(state) {
    return {
        filter: state.main.search_form.filter,
        radius: state.main.search_form.radius,
        selected_path: state.main.selected_path,
        panorama: state.main.panorama,
        open_sidebar: state.main.open_sidebar,
        panorama_index: state.main.panorama_index,
        panorama_count: state.main.panorama_count,
        overlay: state.main.overlay,        
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ 
        setPanoramaCount, 
        setPanoramaIndex, 
        setOverlay,
        setEditingPath, 
        deleteSelectedPath, 
        clearPaths, 
        downloadPath,
        uploadPath,
        setSearchForm,
    }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(BottomBar));
