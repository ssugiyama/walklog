import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { openIOModal, setSelectedPath } from './actions';
import FlatButton from 'material-ui/FlatButton';
import Dialog from 'material-ui/Dialog';
import TextField from 'material-ui/TextField';
import IconButton from 'material-ui/IconButton';
import NavigationClose from 'material-ui/svg-icons/navigation/close';
import styles from './styles';

class IOModal extends Component {
    constructor(props) {
        super(props);
        this.state = {path_json: ''};
    }
    handleImport(e) {
        var obj = JSON.parse(this.state.path_json);
        var coordinates = obj.coordinates;
        var pts = coordinates.map(function (item) {
            return new google.maps.LatLng(item[1], item[0]);
        });
        var path = google.maps.geometry.encoding.encodePath(new google.maps.MVCArray(pts));
        this.props.setSelectedPath(path);
        this.handleClose();
    }
    handleClose() {
        this.props.openIOModal(false);
    }
    initTextField(ref) {
        if (!ref || this.reader) return;
        let textarea = ref.getInputNode();
        if (!textarea) return;
        this.reader = new FileReader();
        this.reader.addEventListener('loadend', e => {
            this.setState({path_json:  e.target.result});
        });

        document.addEventListener("drop", (e) =>  {
            if (e.target === textarea) {
                e.stopPropagation();
                e.preventDefault();
                var files = e.dataTransfer.files;
                this.reader.readAsText(files[0]);
            }
        });
        document.addEventListener("dragenter", (e) =>  {
            if (e.target === textarea) {
                e.stopPropagation();
                e.preventDefault();
            }
        });
        document.addEventListener("dragover", (e) => {
            if (e.target === textarea) {
                e.stopPropagation();
                e.preventDefault();
            }
        });
    }
    componentWillReceiveProps(nextProps) {
        if (nextProps.open_io_modal && !this.props.open_io_modal) {
            let path_json = nextProps.selected_path ? JSON.stringify({
                type: 'LineString',
                coordinates: google.maps.geometry.encoding.decodePath(nextProps.selected_path).map(p => [p.lng(), p.lat()])
            }) : '';
            this.setState({path_json});
        }
    }
    render() {
        let actions = [
            <FlatButton onTouchTap={this.handleImport.bind(this)}  label="import" primary={true} />
        ];
        // due to https://github.com/callemall/material-ui/issues/3394 we use onBlur.
        return (
            <Dialog
                title="Export/Import"
                ref="root"
                actions={actions}
                modal={false}
                open={this.props.open_io_modal}
                onRequestClose={this.handleClose.bind(this)}
            >
                <TextField defaultValue={this.state.path_json} onBlur={ (e) => this.setState({path_json: e.target.value})} fullWidth={true}  multiLine={true} rows={6} rowsMax={6} ref={this.initTextField.bind(this)} onFocus={function(e) {e.target.select();}} hintText="input text or drag geojson file" />
                <IconButton style={styles.dialogCloseButton} onTouchTap={this.handleClose.bind(this)}><NavigationClose /></IconButton>
            </Dialog>
        );
    }
}

function mapStateToProps(state) {
    return { open_io_modal: state.main.open_io_modal, selected_path: state.main.selected_path };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ openIOModal, setSelectedPath }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(IOModal);
