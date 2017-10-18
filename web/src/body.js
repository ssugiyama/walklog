import React, { Component } from 'react';
import NavBarContainer from './nav-bar';
import MapContainer from './map';
import BottomBarContainer from './bottom-bar';
import WalkEditorContainer from './walk-editor';
import GeocodeModalContainer from './geocode-modal';
import { connect } from 'react-redux';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import SideBoxContainer from './side-box';
import { bindActionCreators } from 'redux';
import { openSnackbar } from './actions';
import Snackbar from 'material-ui/Snackbar';

class Body extends Component {
    handleRequestClose() {
        this.props.openSnackbar(false);
    }
    render() {
        return (
            <MuiThemeProvider>
                <div>
                    <NavBarContainer />
                    <SideBoxContainer />
                    <MapContainer />
                    <BottomBarContainer />
                    <WalkEditorContainer />
                    <GeocodeModalContainer />
                    <Snackbar
                        open={this.props.open_snackbar}
                        message={this.props.message}
                        autoHideDuration={4000}
                        onRequestClose={this.handleRequestClose.bind(this)}
                    />
                </div>
            </MuiThemeProvider>
        );
    }
}

function mapStateToProps(state) {
    return { message: state.main.message, open_snackbar: state.main.open_snackbar };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({openSnackbar}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Body);
