import React, { useRef, useEffect, memo } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { setInfoWindow } from './actions';
import { Chart } from 'chart.js';
import { withTheme } from '@material-ui/styles';
import { compareWithMapLoaded } from './utils';

const styles = {
    elevationBox: {
        width: '100%',
        height: '20vh',
    },
};

const ElevationBox = props => {
    const rootRef = useRef();
    const refs = useRef();
    const { highlightedPath, mapLoaded, setInfoWindow } = props;

    // test code for local
    // const interpolatePoints = (pt1, pt2, r) => {
    //     return {lat: r*pt2.lat() + (1-r)*pt1.lat(), lng: r*pt2.lng() + (1-r)*pt1.lng()};
    // };
    // const getElevationPointsAndElevation = (highlightedPath) => {
    //     if (!highlightedPath) return null;
    //     const pp = [];
    //     const path = highlightedPath;
    //     const count = path.length;
    //     let way = 0;
    //     let dsum = 0;
    //     let pt2;
    //     for (let i= 0; i < count-1; i++) {
    //         let pt1 = path[i];
    //         pt2 = path[i+1];
    //         const d = google.maps.geometry.spherical.computeDistanceBetween(pt1, pt2);

    //         while(way < dsum+d ) {
    //             const pt = interpolatePoints(pt1, pt2, (way - dsum)/d);
    //             const h = Math.random()* 50 + 10;
    //             pp.push({elevation: h, location: pt});
    //             way += 50;
    //         }
    //         dsum += d;
    //     }
    //     return pp;
    // };

    const requestElevation = () =>  {
        if (!highlightedPath) return;
        const path = google.maps.geometry.encoding.decodePath(highlightedPath);

        const pathRequest = {
            'path': path,
            'samples': 256
        };
        refs.elevator.getElevationAlongPath(pathRequest, (results, status) => {
            plotElevation(results, status);
        });
        // const results = getElevationPointsAndElevation(path);
        // plotElevation(results, google.maps.ElevationStatus.OK)
    };
    const plotElevation = (results, status) => {
        const { theme } = props;
        if (status == google.maps.ElevationStatus.OK) {
            refs.elevationResults = results;
            const data = results.map(result => result.elevation);
            const labels = results.map(result => '');
            if (! refs.chart) {
                refs.chart = new Chart(rootRef.current.getContext('2d'), {
                    type: 'line',
                    data: {
                        labels,
                    },
                    options: {
                        legend: false,
                        tooltips: {
                            enabled: false
                        },
                        hover: {
                            intersect: false,
                            mode: 'index',
                            onHover: handleHover
                        },
                        scales: {
                            yAxes: [{
                                ticks: {
                                    fontColor: theme.palette.text.primary,
                                },
                                gridLines: {
                                    color: theme.palette.divider,
                                }
                            }],
                            xAxes: [{
                                gridLines: {
                                    display: false,
                                }
                            }]
                        },
                    }
                });
            }
            refs.chart.data.datasets = [{
                data,
                borderWidth: 1,
                borderColor: '#ff0000',
                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                pointStyle: 'dot',
                radius: 1
            }];
            refs.chart.update();
        }
    };
    const handleHover = (ev, elms) => {
        if (elms.length == 0) {
            setInfoWindow({open: false});
        }
        else {
            const elevation = refs.elevationResults[elms[0]._index];
            if (!elevation) return;
            var y = Math.round(elevation.elevation);
            setInfoWindow({ open: true, message: y + 'm', position: elevation.location});
        }
    };
    const updateChart = () => {
        if ( !mapLoaded ) return;
        if (! refs.elevator ) {
            refs.elevator = new google.maps.ElevationService();
        }
        requestElevation();
    };
    useEffect(() => {
        updateChart();
    });

    if (highlightedPath)
        return (
            <canvas style={styles.elevationBox} ref={rootRef}></canvas>
        );
    else
        return null;
    
};

function mapStateToProps(state) {
    const { highlightedPath, mapLoaded } = state.main;
    return {
        highlightedPath, mapLoaded
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ setInfoWindow }, dispatch);
}

export default withTheme(connect(mapStateToProps, mapDispatchToProps)(memo(ElevationBox, compareWithMapLoaded)));
