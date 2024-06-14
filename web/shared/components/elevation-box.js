import React, { useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Box from '@mui/material/Box';
import config from 'react-global-configuration';
import bb, { line } from 'billboard.js';
import { setElevationInfoWindow } from '../features/map';
import 'billboard.js/dist/billboard.css';
import './billboard.dark.css';

const interpolatePoints = (pt1, pt2, r) => (
    { lat: r * pt2.lat + (1 - r) * pt1.lat, lng: r * pt2.lng + (1 - r) * pt1.lng }
);
const getElevationPointsAndElevationForTest = (path) => {
    if (!path) return null;
    const pp = [];
    const count = path.length;
    let way = 0;
    let dsum = 0;
    let pt2;
    for (let i = 0; i < count - 1; i += 1) {
        const pt1 = path[i];
        pt2 = path[i + 1];
        const d = google.maps.geometry.spherical.computeDistanceBetween(pt1, pt2);
        while (way < dsum + d) {
            const pt = interpolatePoints(pt1, pt2, (way - dsum) / d);
            const h = Math.random() * 50 + 10;
            pp.push({ elevation: h, location: pt });
            way += 50;
        }
        dsum += d;
    }
    return pp;
};

const ElevationBox = () => {
    const rootRef = useRef();
    const refs = useRef({});
    const selectedItem = useSelector((state) => state.api.selectedItem);
    const mapLoaded = useSelector((state) => state.map.mapLoaded);
    const dispatch = useDispatch();
    const handleHover = (d) => {
        if (!d) {
            dispatch(setElevationInfoWindow({ open: false }));
        } else {
            const elevation = refs.current.elevationResults[d.index];
            if (!elevation) return;
            const y = Math.round(d.value);
            dispatch(setElevationInfoWindow({ open: true, message: `${y}m`, position: elevation.location }));
        }
    };
    const plotElevation = (results, status) => {
        if (status === google.maps.ElevationStatus.OK) {
            refs.current.elevationResults = results;
            const data = results.map((result) => result.elevation);
            if (!refs.current.chart) {
                const mapStyles = config.get('mapStyleConfig');
                refs.current.chart = bb.generate({
                    bindto: rootRef.current,
                    data: {
                        columns: [['elevation', 0]],
                        type: line(),
                        onover(d) {
                            handleHover(d);
                        },
                        colors: { elevation: mapStyles.polylines.current.strokeColor },
                    },
                    legend: {
                        show: false,
                    },
                    tooltip: {
                        show: false,
                    },
                    axis: {
                        x: {
                            show: false,
                        },
                        y: {
                            tick: {
                                culling: true,
                            },
                        },
                    },
                    line: {
                        zerobased: true,
                    },
                    point: {
                        r: 1.5,
                    },
                });
            }
            refs.current.chart.load({
                columns: [
                    ['elevation'].concat(data),
                ],
            });
        }
    };
    const requestElevation = () => {
        if (!selectedItem) return;
        const path = google.maps.geometry.encoding.decodePath(selectedItem.path);

        const pathRequest = {
            path,
            samples: 256,
        };
        if (process.env.TEST_ELEVATION) {
            const results = getElevationPointsAndElevationForTest(path);
            plotElevation(results, google.maps.ElevationStatus.OK);
        } else {
            refs.current.elevator.getElevationAlongPath(pathRequest, (results, status) => {
                plotElevation(results, status);
            });
        }
    };

    const updateChart = () => {
        if (!mapLoaded) return;
        if (!refs.current.elevator && !process.env.TEST_ELEVATION) {
            refs.current.elevator = new google.maps.ElevationService();
        }
        requestElevation();
    };
    useEffect(() => {
        updateChart();
    });

    if (selectedItem) {
        return (
            <Box width="100%" height="20vh" ref={rootRef} />
        );
    }
    return null;
};

export default ElevationBox;
