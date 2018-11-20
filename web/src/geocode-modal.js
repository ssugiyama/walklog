import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { openGeocodeModal, setCenter } from './actions';
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
        this.state = {address: ''};
    }
    handleSubmit() {
        this.geocoder.geocode( { 'address': this.state.address}, (results, status) =>  {
            if (status == google.maps.GeocoderStatus.OK) {
                this.props.setCenter(results[0].geometry.location);
                this.handleClose();
            } else {
                alert('Geocode was not successful for the following reason: ' + status);
            }
        });
    }
    handleClose() {
        this.props.openGeocodeModal(false);
    }
    componentDidMount() {
        if (typeof google === 'undefined') return;
        this.geocoder = new google.maps.Geocoder();
    }
    static getDerivedStateFromProps(nextProps, prevState) {
        if (nextProps.open_geocode_modal&& !this.props.open_geocode_modal) {
            return {address: ''};
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
    return { open_geocode_modal: state.main.open_geocode_modal };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ openGeocodeModal, setCenter }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(GeocodeModal);
