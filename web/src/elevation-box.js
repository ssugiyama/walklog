import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { setAdditionalView } from './actions';
import marked from 'marked';
import { Chart } from "chart.js";
import styles from './styles';

class ElevationBox extends Component {
    constructor(props) {
	super(props);
	this.elevator = new google.maps.ElevationService();
	this.chart = null;
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
            let data = results.map(result => result.elevation);
	    let labels = results.map(result => '');
	    this.chart = new Chart(this.refs.root.getContext("2d"), {
		type: 'line',
		data: {
		    labels,
		    datasets:[ {
			data,
			borderWidth: 1,
			borderColor: '#f00',
			backgroundColor: 'rgba(255, 0, 0, 0.1)',
			pointStyle: 'dot',
			radius: 1
		    }]
		},
		options: {
		    legend: false,
		    tooltips: {
			enabled: false
		    },
		    hover: {
			mode: 'x-axis',
			onHover: this.handleHover.bind(this)
		    }
		}
	    });
        }
    }
    handleHover(elms) {
	if (elms.length == 0) {
            this.props.hideInfoWindow();
	}
	else {
            var elevation = this.elevationResults[elms[0]._index];
            if (!elevation) return;
            var y = Math.round(elevation.elevation);
	    this.props.showInfoWindow(y + 'm', elevation.location);
	}
    }
    handleMouseout() {
        this.props.hideInfoWindow();
    }
    componentDidMount() {
	//	this.hoverListener = this.refs.body.addEventListener('plothover', this.handleHover.bind(this));
//	$(this.refs.body).on('plothover', this.handleHover.bind(this));
//	$(this.refs.body).on('mouseout', this.handleMouseout.bind(this));
//	this.requestElevation(this.props.selected_path);
    }
    componentWillUnmount() {
//	$(this.refs.body).off();
    }
    shouldComponentUpdate(nextProps, nextState) {
	if (nextProps.selected_path !== this.props.selected_path) {
	    return true;
	}
	else {
	    return false;
	}
    }
    componentWillReceiveProps(nextProps) {
	if (this.chart) {
	    this.chart.destroy();
	    this.chart = null;
	}
	this.requestElevation(nextProps.selected_path);
    }
    render() {
	if (this.props.selected_path) 
	    return (
		<canvas style={styles.elevationBox} ref="root"></canvas>
	    );
	else
	    return null;
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
