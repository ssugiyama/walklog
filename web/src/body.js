import React, { Component } from 'react';
import CssBaseline from 'material-ui/CssBaseline';
import MapContainer from './map';
import BottomBarContainer from './bottom-bar';
import WalkEditorContainer from './walk-editor';
import GeocodeModalContainer from './geocode-modal';
import { connect } from 'react-redux';
import SideBoxContainer from './side-box';
import { bindActionCreators } from 'redux';
import { openSnackbar, toggleSidebar } from './actions';
import Snackbar from 'material-ui/Snackbar';
import Button from 'material-ui/Button';
import MenuIcon from '@material-ui/icons/Menu';
import { withStyles } from 'material-ui/styles';

const styles = {
    drawerButton: {
        display: 'absolute',
        top: 5,
        left: 20,
    },
};

class Body extends Component {
    handleRequestClose() {
        this.props.openSnackbar(false);
    }
    handleShow() {
        this.props.toggleSidebar();
    }
    render() {
        const {classes} = this.props;
        return (
            <div>
                <CssBaseline />
                <SideBoxContainer />
                <MapContainer />
                <BottomBarContainer />
                <Button variant="fab" color="primary" onClick={this.handleShow.bind(this)} className={classes.drawerButton}>
                    <MenuIcon />
                </Button>
                <WalkEditorContainer />
                <GeocodeModalContainer />
                <Snackbar
                    open={this.props.open_snackbar}
                    message={this.props.message}
                    autoHideDuration={4000}
                    onClose={this.handleRequestClose.bind(this)}
                />
            </div>
        );
    }
}

function mapStateToProps(state) {
    return { message: state.main.message, open_snackbar: state.main.open_snackbar };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({openSnackbar, toggleSidebar}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(Body));
