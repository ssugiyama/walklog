import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import NavBarContainer from './nav-bar';
import ContentContainer from './content';
import WalkEditorContainer from './walk-editor';
import IOModalContainer from './io-modal';
import GeocodeModalContainer from './geocode-modal';
import { connect } from 'react-redux';
class Body extends Component {
    componentDidMount() {
    }
    render() {   
	return (
	    <div>
		<NavBarContainer />
		<ContentContainer />
		<WalkEditorContainer />
		<IOModalContainer />
		<GeocodeModalContainer />
	    </div>
	);
    }
}

function mapStateToProps(state) {
    return state;
}

function mapDispatchToProps(dispatch) {
    return {
	handleSubmit: () => { dispatch(increment()) }
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Body);
