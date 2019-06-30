import React, { useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setInfoWindow } from './actions';
import { Chart } from 'chart.js';
import { useTheme } from '@material-ui/styles';
import Box from '@material-ui/core/Box';

const ElevationBox = () => {
    const rootRef = useRef();
    const refs = useRef({});
    const highlightedPath = useSelector(state => state.main.highlightedPath);
    const mapLoaded       = useSelector(state => state.main.mapLoaded);
    const dispatch        = useDispatch();
    const theme           = useTheme();
    // test code for local
    if (process.env.NODE_ENV == 'local') {
        var interpolatePoints = (pt1, pt2, r) => {
            return {lat: r*pt2.lat() + (1-r)*pt1.lat(), lng: r*pt2.lng() + (1-r)*pt1.lng()};
        };
        var getElevationPointsAndElevation = (highlightedPath) => {
            if (!highlightedPath) return null;
            const pp = [];
            const path = highlightedPath;
            const count = path.length;
            let way = 0;
            let dsum = 0;
            let pt2;
            for (let i= 0; i < count-1; i++) {
                let pt1 = path[i];
                pt2 = path[i+1];
                const d = google.maps.geometry.spherical.computeDistanceBetween(pt1, pt2);

                while(way < dsum+d ) {
                    const pt = interpolatePoints(pt1, pt2, (way - dsum)/d);
                    const h = Math.random()* 50 + 10;
                    pp.push({elevation: h, location: pt});
                    way += 50;
                }
                dsum += d;
            }
            return pp;
        };
    }

    const requestElevation = () =>  {
        if (!highlightedPath) return;
        const path = google.maps.geometry.encoding.decodePath(highlightedPath);

        const pathRequest = {
            'path': path,
            'samples': 256
        };
        if (process.env.NODE_ENV == 'local') {
            const results = getElevationPointsAndElevation(path);
            plotElevation(results, google.maps.ElevationStatus.OK);
        }
        else {
            refs.current.elevator.getElevationAlongPath(pathRequest, (results, status) => {
                plotElevation(results, status);
            });
        } 
    };
    const plotElevation = (results, status) => {
        if (status == google.maps.ElevationStatus.OK) {
            refs.current.elevationResults = results;
            const data = results.map(result => result.elevation);
            const labels = results.map(() => '');
            if (! refs.current.chart) {
                refs.current.chart = new Chart(rootRef.current.getContext('2d'), {
                    type: 'line',
                    data: {
                        labels,
                    },
                    options: {
                        legend: false,
                        responsive: true,
                        maintainAspectRatio: false,
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
            refs.current.chart.data.datasets = [{
                data,
                borderWidth: 1,
                borderColor: '#ff0000',
                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                pointStyle: 'dot',
                radius: 1
            }];
            refs.current.chart.update();
        }
    };
    const handleHover = (ev, elms) => {
        if (elms.length == 0) {
            dispatch(setInfoWindow({open: false}));
        }
        else {
            const elevation = refs.current.elevationResults[elms[0]._index];
            if (!elevation) return;
            var y = Math.round(elevation.elevation);
            dispatch(setInfoWindow({ open: true, message: y + 'm', position: elevation.location}));
        }
    };
    const updateChart = () => {
        if ( !mapLoaded ) return;
        if (! refs.current.elevator ) {
            refs.current.elevator = new google.maps.ElevationService();
        }
        requestElevation();
    };
    useEffect(() => {
        updateChart();
    });

    if (highlightedPath)
        return (
            <Box width="100%" height="20vh">
                <canvas ref={rootRef}></canvas>
            </Box>
        );
    else
        return null;
    
};

export default ElevationBox;
