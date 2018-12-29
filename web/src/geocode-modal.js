import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { openGeocodeModal, setGeoMarker } from './actions';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import IconButton from '@material-ui/core/IconButton';
import NavigationClose from '@material-ui/icons/Close';

class GeocodeModal extends Component {
    constructor(props) {
        super(props);
        this.state = {address: '', initialized: false};
    }
    handleSubmit() {
        this.geocoder.geocode( { 'address': this.state.address}, (results, status) =>  {
            if (status == google.maps.GeocoderStatus.OK) {
                this.props.setGeoMarker({ 
                    lat: results[0].geometry.location.lat(),
                    lng: results[0].geometry.location.lng(),
                    show: true
                }, true);
                this.handleClose();
            } else {
                alert('Geocode was not successful for the following reason: ' + status);
            }
        });
    }
    handleClose() {
        this.props.openGeocodeModal(false);
        this.setState({
            initialized: false
        });
    }
    componentDidUpdate(prevProps, prevSate) {
        if ( this.props.map && !this.geocoder) {
            this.geocoder = new google.maps.Geocoder();
        }
    }
    static getDerivedStateFromProps(nextProps, prevState) {
        if (nextProps.open_geocode_modal&& !prevState.initialized) {
            return {address: '', initialized: true};
        }
        else {
            return null;
        }
    }
    render() {
        return (
            <Dialog
                open={this.props.open_geocode_modal}
                onClose={this.handleClose.bind(this)}
            >
                <DialogTitle>Geocode</DialogTitle>
                <DialogContent>
                    <TextField value={this.state.address} onChange={e => this.setState({address: e.target.value})} onKeyPress={e => { if (e.charCode == 13) this.handleSubmit(); }} label="address"  fullWidth={true} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.handleClose.bind(this)}>Cancel</Button>
                    <Button onClick={this.handleSubmit.bind(this)} color="primary">Move to</Button>
                </DialogActions>
            </Dialog>
        );
    }
}

function mapStateToProps(state) {
    const {open_geocode_modal, map} = state.main;
    return { 
        open_geocode_modal, 
        map, 
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ openGeocodeModal, setGeoMarker }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(GeocodeModal);
