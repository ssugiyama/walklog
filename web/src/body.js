import React, { Component } from 'react';
import NavBarContainer from './nav-bar';
import MapContainer from './map';
import BottomBarContainer from './bottom-bar';
import WalkEditorContainer from './walk-editor';
import IOModalContainer from './io-modal';
import GeocodeModalContainer from './geocode-modal';
import { connect } from 'react-redux';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import SideBoxContainer from './side-box';
import { bindActionCreators } from 'redux';
import { openMessage } from './actions';
import Snackbar from 'material-ui/Snackbar';

class Body extends Component {
    handleRequestClose() {
        this.props.openMessage(null);
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
                    <IOModalContainer />
                    <GeocodeModalContainer />
                    <Snackbar
                        open={this.props.message != null}
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
    return { message: state.main.message };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({openMessage}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Body);
