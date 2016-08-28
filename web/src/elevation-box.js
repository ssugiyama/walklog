import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { setInfoWindow } from './actions';
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
        if (!selected_path) return;
	let path = google.maps.geometry.encoding.decodePath(selected_path);

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
            this.props.setInfoWindow({open: false});
	}
	else {
            var elevation = this.elevationResults[elms[0]._index];
            if (!elevation) return;
            var y = Math.round(elevation.elevation);
	    this.props.setInfoWindow({ open: true, message: y + 'm', position: elevation.location});
	}
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
		<div>
		    <h3>elevation</h3>
		    <canvas style={styles.elevationBox} ref="root"></canvas>
		</div>
	    );
	else
	    return null;
    }
}

function mapStateToProps(state) {
    return {
	selected_path: state.main.selected_path,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ setInfoWindow }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(ElevationBox);
