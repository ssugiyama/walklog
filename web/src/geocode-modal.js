import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { openGeocodeModal, setCenter } from './actions';
import Button from 'material-ui/Button';
import Dialog, {
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from 'material-ui/Dialog';
import TextField from 'material-ui/TextField';
import IconButton from 'material-ui/IconButton';
import NavigationClose from '@material-ui/icons/Close';

class GeocodeModal extends Component {
    constructor(props) {
        super(props);
        this.state = {address: ''};
    }
    handleSubmit(address = this.state.address) {
        this.geocoder.geocode( { 'address': address}, (results, status) =>  {
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
        this.geocoder = new google.maps.Geocoder();
    }
    componentWillReceiveProps(nextProps) {
        if (nextProps.open_geocode_modal&& !this.props.open_geocode_modal) {
            this.setState({address: ''});
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
                    <TextField defaultValue={this.state.address} onBlur={e => this.setState({address: e.target.value})} onKeyPress={e => { if (e.charCode == 13) this.handleSubmit(e.target.value); }} label="address"  fullWidth={true} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.handleClose.bind(this)}>Cancel</Button>
                    <Button onClick={this.handleSubmit.bind(this, null)} color="primary">Move to</Button>
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
