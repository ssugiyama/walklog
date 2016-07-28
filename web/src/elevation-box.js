import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { setAdditionalView } from './actions';
import marked from 'marked';

class ElevationBox extends Component {
    constructor(props) {
	super(props);
	this.elevator = new google.maps.ElevationService();
    }
    handleClose() {
	this.props.setAdditionalView(null);
    }
    requestElevation(selected_path) {
        let path = [];
        if (!selected_path) return;
        selected_path.getPath().forEach((elem,i) => {
            path.push(elem);
        });
	
        let pathRequest = {
            'path': path,
            'samples': 256
        }
        this.elevator.getElevationAlongPath(pathRequest, (results, status) => {
            this.plotElevation(results, status);
        });
    }
    plotElevation(results, status) {
        if (status == google.maps.ElevationStatus.OK) {
            this.elevationResults = results;
            var data = [];
            for (var i = 0; i < results.length; i++) {
                data.push([i, this.elevationResults[i].elevation]);
            }
            $.plot($(this.refs.body), [data], {
                xaxis : {show: false},
                colors : ['#ff0000'],
                grid : {
                    hoverable : true,
                    backgroundColor: 'white'
                },
            });
        }
    }
    handleHover(event, pos, item) {
        var elevation = this.elevationResults[~~pos.x];
        if (!elevation) return;
        var y = Math.round(elevation.elevation);
	this.props.showInfoWindow(y + 'm', elevation.location);
    }
    handleMouseout() {
        this.props.hideInfoWindow();
    }
    componentDidMount() {
	//	this.hoverListener = this.refs.body.addEventListener('plothover', this.handleHover.bind(this));
	$(this.refs.body).on('plothover', this.handleHover.bind(this));
	$(this.refs.body).on('mouseout', this.handleMouseout.bind(this));
	this.requestElevation(this.props.selected_path);
    }
    componentWillUnmount() {
	$(this.refs.body).off();
    }
    componentWillReceiveProps(nextProps) {
	this.requestElevation(nextProps.selected_path);
    }
    render() {
	return (
            <div id="elevation-box">
                <button className="close" onClick={this.handleClose.bind(this)}>&times;</button>
                <div className="body" ref="body"></div>
            </div>	    
	);
    }
}

function mapStateToProps(state) {
    return {
	selected_path: state.main.selected_path,
	showInfoWindow: state.main.component_procs.showInfoWindow,	
	hideInfoWindow: state.main.component_procs.hideInfoWindow,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ setAdditionalView }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(ElevationBox);
