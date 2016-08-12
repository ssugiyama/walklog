import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { setComponentProcs } from './actions';
import FlatButton from 'material-ui/FlatButton';
import Dialog from 'material-ui/Dialog';
import DatePicker from 'material-ui/DatePicker';
import TextField from 'material-ui/TextField';
import Toggle from 'material-ui/Toggle';
import IconButton from 'material-ui/IconButton';
import NavigationClose from 'material-ui/svg-icons/navigation/close';
import styles from './styles';

class GeocodeModal extends Component {
    constructor(props) {
	super(props);
	this.state = {address: '', open: false};
	this.geocoder = new google.maps.Geocoder();
    }
    componentDidMount() {
	let openGeocodeModal = () => {
	    this.setState({address: '', open: true});
	};
	this.props.setComponentProcs({openGeocodeModal});	
    }
    handleSubmit(address = this.state.address) {
        this.geocoder.geocode( { 'address': address}, (results, status) =>  {
	    if (status == google.maps.GeocoderStatus.OK) {
		this.props.setCenter(results[0].geometry.location);
		this.setState({ open:  false} );
	    } else {
		alert("Geocode was not successful for the following reason: " + status);
	    }
	});
    }
    handleClose() {
	this.setState({ open: false });
    }    
    render() {
	let actions = [
	    <FlatButton onTouchTap={this.handleSubmit.bind(this)}  label="Move to" primary={true} />
	];
	// due to https://github.com/callemall/material-ui/issues/3394 we use onBlur.
	return (
	    <Dialog
                title="Geocode"
		actions={actions}
		modal={false}
		open={this.state.open}
                onRequestClose={this.handleClose.bind(this)}
	    >
	    <TextField defaultValue={this.state.address} onBlur={e => this.setState({address: e.target.value})} onKeyPress={e => { if (e.charCode == 13) this.handleSubmit(e.target.value) }} floatingLabelText="address" floatingLabelFixed={true}  fullWidth={true} />
	    <IconButton style={styles.dialogCloseButton} onTouchTap={this.handleClose.bind(this)}><NavigationClose /></IconButton>
            </Dialog>
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
