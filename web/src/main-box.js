import React, { Component, PropTypes } from 'react';
import MapContainer from './map'
import { connect } from 'react-redux';
import CommentBoxContainer from './comment-box';
import ElevationBoxContainer from './elevation-box';
import PanoramaBoxContainer from './panorama-box';

class MainBox extends Component {
    componentDidMount() {

    }
    render() {   
	return (
	    <div className="main">
		<MapContainer />
		{ this.props.additional_view == 'elevation' ? 
		<ElevationBoxContainer /> : null }
		{ this.props.additional_view == 'panorama' ?
		<PanoramaBoxContainer /> : null }
	    { this.props.additional_view == 'comment' ?
	      <CommentBoxContainer /> : null } 
	    </div>

	);
    }
}
function mapStateToProps(state) {
    return { additional_view: state.main.additional_view }
}

function mapDispatchToProps(dispatch) {
    return {
	handleSubmit: () => { dispatch(increment()) }
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(MainBox);

