import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { setPanoramaCount, setPanoramaIndex, setOverlay, 
    setEditingPath, deleteSelectedPath, clearPaths, openIOModal, setSearchForm, downloadPath, uploadPath } from './actions';
import IconButton from 'material-ui/IconButton';
import DropDownMenu from 'material-ui/DropDownMenu';
import MenuItem from 'material-ui/MenuItem';
import EditorModeEdit from 'material-ui/svg-icons/editor/mode-edit';
import ActionDelete from 'material-ui/svg-icons/action/delete';
import NavigationRefresh from 'material-ui/svg-icons/navigation/refresh';
import NavigationCancel from 'material-ui/svg-icons/navigation/cancel';
import ActionSwapVert from 'material-ui/svg-icons/action/swap-vert';
import NavigationArrowForward from 'material-ui/svg-icons/navigation/arrow-forward';
import NavigationArrowBack from 'material-ui/svg-icons/navigation/arrow-back';
import AvFastForward from 'material-ui/svg-icons/av/fast-forward';
import AvFastRewind from 'material-ui/svg-icons/av/fast-rewind';
import FileDownload from 'material-ui/svg-icons/file/file-download';
import FileUpload from 'material-ui/svg-icons/file/file-upload';
import MapsMap from 'material-ui/svg-icons/maps/map';
import {Toolbar, ToolbarGroup, ToolbarSeparator, ToolbarTitle} from 'material-ui/Toolbar';
import styles from './styles';

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
    handleSelectRadius(event, index, r) {
        this.props.setSearchForm({radius: r});
    }
    render() {
        return (
            <Toolbar style={styles.bottomBar} noGutter={true}>
            { this.props.overlay ? (
                <ToolbarGroup style={styles.bottomBarGroup} firstChild={true} lastChild={true}>
                    <IconButton tooltip="-10" tooltipPosition="top-center" touch={true} onTouchTap={ () => { this.props.setPanoramaIndex(this.props.panorama_index - 10); } }><AvFastRewind /></IconButton>
                    <IconButton tooltip="-1" tooltipPosition="top-center" touch={true} onTouchTap={ () => { this.props.setPanoramaIndex(this.props.panorama_index - 1); }}><NavigationArrowBack /></IconButton>
                    <span className="label label-info"><span>{ this.props.panorama_index+1 } </span> / <span>{ this.props.panorama_count } </span></span>
                    <IconButton tooltip="+1" tooltipPosition="top-center" touch={true} onTouchTap={ () => { this.props.setPanoramaIndex(this.props.panorama_index + 1); }}><NavigationArrowForward /></IconButton>
                    <IconButton tooltip="+10" tooltipPosition="top-center" touch={true} onTouchTap={ () => { this.props.setPanoramaIndex(this.props.panorama_index + 10); }}><AvFastForward /></IconButton>
                    <ToolbarSeparator />
                    <IconButton tooltip="back to map" tooltipPosition="top-center" touch={true} onTouchTap={ () => { this.props.setOverlay(false); }}><MapsMap /></IconButton>
                </ToolbarGroup>
            ) : this.props.filter == 'neighborhood' ? (
                <ToolbarGroup style={styles.bottomBarGroup} firstChild={true} lastChild={true}>
                    <ToolbarTitle text='Radius' />
                    <DropDownMenu value={this.props.radius} onChange={this.handleSelectRadius.bind(this)}>
                        <MenuItem value={1000} primaryText="1km" />
                        <MenuItem value={500} primaryText="500m" />
                        <MenuItem value={250} primaryText="250m" />
                        <MenuItem value={100} primaryText="100m" />
                        {
                            [1000, 500, 250, 100].some(r => r == this.props.radius) ? null
                            : (<MenuItem value={this.props.radius} primaryText={Math.round(this.props.radius) + 'm'} />)
                        }
                    </DropDownMenu>
                    <IconButton tooltip="cancel" tooltipPosition="top-center" touch={true} onTouchTap={() => this.props.setSearchForm({filter: 'any'}) }><NavigationCancel /></IconButton>
                </ToolbarGroup>            
            ) : this.props.filter == 'cities' ? (
                <ToolbarGroup style={styles.bottomBarGroup} firstChild={true} lastChild={true}>
                    <ToolbarTitle text='Cities' />
                    <IconButton tooltip="clear" tooltipPosition="top-center" touch={true} onTouchTap={this.resetCities.bind(this)}><NavigationRefresh /></IconButton>
                    <IconButton tooltip="cancel" tooltipPosition="top-center" touch={true} onTouchTap={() => this.props.setSearchForm({filter: 'any'}) }><NavigationCancel /></IconButton>
                </ToolbarGroup>            
            )            
            : (
                <ToolbarGroup style={styles.bottomBarGroup} firstChild={true} lastChild={true}>
                    <ToolbarTitle text='Path' />
                    <IconButton tooltip="edit" tooltipPosition="top-center" touch={true} onTouchTap={() => this.props.setEditingPath() } disabled={! this.props.selected_path} ><EditorModeEdit /></IconButton>
                    <IconButton tooltip="delete" tooltipPosition="top-center" touch={true} onTouchTap={() => this.props.deleteSelectedPath() }  disabled={! this.props.selected_path}><ActionDelete /></IconButton>
                    <IconButton tooltip="clear all" tooltipPosition="top-center" touch={true} onTouchTap={() => this.props.clearPaths() }><NavigationRefresh /></IconButton>
                    <IconButton tooltip="download" tooltipPosition="top-center" touch={true} onTouchTap={() => this.props.downloadPath() }  disabled={! this.props.selected_path}><FileDownload /></IconButton>
                    <IconButton tooltip="upload" tooltipPosition="top-center" touch={true} onTouchTap={() => this.props.uploadPath() }><FileUpload /></IconButton>
                    <IconButton tooltip="export/import..." tooltipPosition="top-center" touch={true} onTouchTap={() => this.props.openIOModal(true)}><ActionSwapVert /></IconButton>
                    <span className="label label-info">{`${this.state.length.toFixed(1)}km`}</span>
                </ToolbarGroup>            
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
        openIOModal,
        setSearchForm,
    }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(BottomBar);
