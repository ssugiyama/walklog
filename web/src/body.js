import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import NavBarContainer from './nav-bar';
import MapContainer from './map';
import WalkEditorContainer from './walk-editor';
import IOModalContainer from './io-modal';
import GeocodeModalContainer from './geocode-modal';
import { connect } from 'react-redux';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import SideBoxContainer from './side-box';

class Body extends Component {
    render() {
        return (
            <MuiThemeProvider>
                <div>
                    <NavBarContainer />
                    <SideBoxContainer />
                    <MapContainer />
                    <WalkEditorContainer />
                    <IOModalContainer />
                    <GeocodeModalContainer />
                </div>
            </MuiThemeProvider>
        );
    }
}

function mapStateToProps(state) {
    return state;
}

function mapDispatchToProps(dispatch) {
    return {
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Body);
