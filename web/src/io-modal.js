import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { setComponentProcs } from './actions';

class IOModal extends Component {
    constructor(props) {
	super(props);
	this.state = {path_json: ''};
    }
    componentDidMount() {
	let textarea = $(this.refs.textarea);
        textarea.on('click', function () {
            this.select();
        });
        var reader = new FileReader();
        reader.addEventListener('loadend', e => {
            this.setState({path_json:  e.target.result});
        });
	
        textarea.bind("drop", function (e) {
            e.stopPropagation();
            e.preventDefault();
            var files = e.originalEvent.dataTransfer.files;
            reader.readAsText(files[0]);
        }).bind("dragenter", function (e) {
            e.stopPropagation();
            e.preventDefault();
        }).bind("dragover", function (e) {
            e.stopPropagation();
            e.preventDefault();
        });
	
	let openIOModal = () => {
	    let state = {path_json: this.props.path_manager.selectionAsGeoJSON()};
	    this.setState(state);	    
	    $(this.refs.root).modal('show');
	};
	this.props.setComponentProcs({openIOModal});	
    }
    handleImport(e) {
        var obj = JSON.parse(this.state.path_json);
        var coordinates = obj.coordinates;
        var pts = coordinates.map(function (item) {
            return new google.maps.LatLng(item[1], item[0]);
        });
        var path = new google.maps.MVCArray(pts);
        this.props.path_manager.showPath(path, true);
	$(this.refs.root).modal('hide');	
    }
    render() {
	return (
	    <div ref="root" className="modal fade">
            <div className="modal-dialog">
            <div className="modal-content">
            <div className="modal-header">
            <button type="button" className="close" data-dismiss="modal" aria-hidden="true">&times;</button>
            <h4 className="modal-title">Export/Import</h4>
            </div>
            <div className="modal-body">
		<textarea ref="textarea" value={this.state.path_json} onChange={e => this.setState({path_json: e.target.value})}  placeholder="input text or drag JSON file."></textarea>
            </div>
            <div className="modal-footer">
		<button type="button" className="btn btn-primary" onClick={this.handleImport.bind(this)}>Import</button>
            </div>
            </div>
            </div>
	    </div>
	);
    }
}

function mapStateToProps(state) {
    return { path_manager: state.main.path_manager };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ setComponentProcs }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(IOModal);
