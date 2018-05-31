import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { setInfoWindow } from './actions';
import Typography from '@material-ui/core/Typography';

const Chart = typeof window !== 'undefined' ? require('chart.js').Chart : {};

const styles = {
    elevationBox: {
        width: '100%',
        height: 250,
    },
};

class ElevationBox extends Component {
    constructor(props) {
        super(props);
        this.chart = null;
    }
    requestElevation(highlighted_path) {
        if (!highlighted_path) return;
        const path = google.maps.geometry.encoding.decodePath(highlighted_path);

        const pathRequest = {
            'path': path,
            'samples': 256
        };
        this.elevator.getElevationAlongPath(pathRequest, (results, status) => {
            this.plotElevation(results, status);
        });
    }
    plotElevation(results, status) {
        if (status == google.maps.ElevationStatus.OK) {
            this.elevationResults = results;
            const data = results.map(result => result.elevation);
            const labels = results.map(result => '');
            this.chart = new Chart(this.refs.root.getContext('2d'), {
                type: 'line',
                data: {
                    labels,
                    datasets:[ {
                        data,
                        borderWidth: 1,
                        borderColor: '#ff0000',
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
                        intersect: false,
                        mode: 'index',
                        onHover: this.handleHover.bind(this)
                    }
                }
            });
        }
    }
    handleHover(ev, elms) {
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
        if (nextProps.highlighted_path !== this.props.highlighted_path) {
            return true;
        }
        else {
            return false;
        }
    }
    componentDidMount() {
        if (typeof google === 'undefined') return;
        this.elevator = new google.maps.ElevationService();
        this.requestElevation(this.props.highlighted_path);
    }
    componentWillReceiveProps(nextProps) {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        this.requestElevation(nextProps.highlighted_path);
    }
    render() {
        if (this.props.highlighted_path)
            return (
                <canvas style={styles.elevationBox} ref="root"></canvas>
            );
        else
            return null;
    }
}

function mapStateToProps(state) {
    return {
        highlighted_path: state.main.highlighted_path,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ setInfoWindow }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(ElevationBox);
