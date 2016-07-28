import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { setComponentProcs } from './actions';

class GeocodeModal extends Component {
    constructor(props) {
	super(props);
	this.state = {address: ''};
	this.geocoder = new google.maps.Geocoder();
    }
    componentDidMount() {
	let address = $(this.refs.address);
	$(this.refs.root).on('shown.bs.modal', () => {
	    this.refs.address.focus();	    
	});
	let openGeocodeModal = () => {
	    this.setState({address: ''});
	    $(this.refs.root).modal('show');
	};
	this.props.setComponentProcs({openGeocodeModal});	
    }
    handleSubmit() {
        this.geocoder.geocode( { 'address': this.state.address}, (results, status) =>  {
	    if (status == google.maps.GeocoderStatus.OK) {
		this.props.setCenter(results[0].geometry.location);
		$(this.refs.root).modal('hide');	
	    } else {
		alert("Geocode was not successful for the following reason: " + status);
	    }
	});
    }
    render() {
	return (
	    <div ref="root" className="modal fade">
            <div className="modal-dialog">
            <div className="modal-content">
            <div className="modal-header">
            <button type="button" className="close" data-dismiss="modal" aria-hidden="true">&times;</button>
            <h4 className="modal-title">Location</h4>
            </div>
            <div className="modal-body">
	    <div className="form-group">
            <label className="control-label col-xs-2">address</label>
		<input type="text" className="form-inline-control col-xs-10" ref="address" value={this.state.address} onChange={e => this.setState({address: e.target.value})}
	    onKeyPress={e => { if (e.charCode == 13) this.handleSubmit() } } />
            </div>
            </div>
            <div className="modal-footer">
		<button type="button" className="btn btn-primary" onClick={this.handleSubmit.bind(this)}>Move to</button>
            </div>
            </div>
            </div>
	    </div>
	);
    }
}

function mapStateToProps(state) {
    return { setCenter: state.main.component_procs.setCenter};
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ setComponentProcs }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(GeocodeModal);
