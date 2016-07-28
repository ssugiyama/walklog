import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import SideBoxContainer from './side-box';
import MainBoxContainer from './main-box';
import { connect } from 'react-redux';
class Content extends Component {
    handleResize() {
	$(this.refs.root).outerHeight($(window).height() - $('.navbar-header').height());
    }
    componentDidMount() {
	this.handleResize();
	window.addEventListener('resize', this.handleResize.bind(this));
    }    
    render() {   
	return (
	    <div className="content open" ref="root">
                <SideBoxContainer />
	        <MainBoxContainer />
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

export default connect(mapStateToProps, mapDispatchToProps)(Content);
