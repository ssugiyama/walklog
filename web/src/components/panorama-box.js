import React, { useRef, useContext, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setPanoramaCount, setPanoramaIndex, setOverlay } from '../actions';
import IconButton from '@mui/material/IconButton';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import NavigationArrowForwardIcon from '@mui/icons-material/ArrowForward';
import NavigationArrowBackIcon from '@mui/icons-material/ArrowBack';
import AvFastForwardIcon from '@mui/icons-material/FastForward';
import AvFastRewindIcon from '@mui/icons-material/FastRewind';
import MapContext from './utils/map-context';
import Box from '@mui/material/Box';

const PANORAMA_INTERVAL = 50;

const PanoramaBox = props => {
    const selectedItem = useSelector(state => state.main.selectedItem);
    const panoramaIndex = useSelector(state => state.main.panoramaIndex);
    const panoramaCount = useSelector(state => state.main.panoramaCount);
    const overlay = useSelector(state => state.main.overlay);
    const mapLoaded = useSelector(state => state.main.mapLoaded);
    const dispatch = useDispatch();
    const bodyRef = useRef({});
    const refs = useRef({});
    const handleOverlayChange = (e, toggled) => {
        dispatch(setOverlay(toggled));
    };
    const interpolatePoints = (pt1, pt2, r) => {
        return {lat: r*pt2.lat() + (1-r)*pt1.lat(), lng: r*pt2.lng() + (1-r)*pt1.lng()};
    };
    const context = useContext(MapContext);
    const getPanoramaPointsAndHeadings = (path) => {
        if (!path) return null;
        const pph = [];
        const count = path.length;
        let way = 0;
        let dsum = 0;
        let pt2, h;
        for (let i= 0; i < count-1; i++) {
            let pt1 = path[i];
            pt2 = path[i+1];
            const d = google.maps.geometry.spherical.computeDistanceBetween(pt1, pt2);
            h = google.maps.geometry.spherical.computeHeading(pt1, pt2);

            while(way < dsum+d ) {
                const pt = interpolatePoints(pt1, pt2, (way - dsum)/d);
                pph.push([pt, h]);
                way += PANORAMA_INTERVAL;
            }
            dsum += d;
        }
        pph.push([pt2, h]);
        return pph;
    };

    const updatePath = (selectedItem) => {
        if ( ! mapLoaded ) return;
        if (! selectedItem) {
            const pnrm = overlay ? context.state.map.getStreetView() : refs.current.panorama;
            if (pnrm) {
                pnrm.setVisible(false);
            }
            setStreetView(null);
            return;
        }
        const path = google.maps.geometry.encoding.decodePath(selectedItem.path);
        refs.current.panoramaPointsAndHeadings = getPanoramaPointsAndHeadings(path);
        dispatch(setPanoramaCount(refs.current.panoramaPointsAndHeadings.length));
        // setTimeout(() => {this.props.setPanoramaIndex(0);}, 0);
        dispatch(setPanoramaIndex(0));
        showPanorama();
    };

    const showPanorama = () => {
        if ( !mapLoaded || ! refs.current.panoramaPointsAndHeadings ) return;

        const index = panoramaIndex;
        const item = refs.current.panoramaPointsAndHeadings[index];
        const pt = item[0];
        const heading = item[1];
        const pnrm = overlay ? context.state.map.getStreetView() : refs.current.panorama;

        refs.current.streetViewService.getPanoramaByLocation(pt, 50, (data, status) => {
            if (status == google.maps.StreetViewStatus.OK) {
                pnrm.setPano(data.location.pano);
                pnrm.setPov({heading: heading, zoom: 1, pitch: 0});
                pnrm.setVisible(true);
            }
            else {
                pnrm.setVisible(false);
            }
        });
        google.maps.event.trigger(pnrm, 'resize');
    };

    // unmount
    useEffect(() =>{
        return () => {
            setStreetView(null);
        };
    }, []);

    useEffect(() => {
        if (mapLoaded &&  !refs.current.panorama ) {
            refs.current.streetViewService = new google.maps.StreetViewService();
            bodyRef.current.addEventListener('touchmove', e =>{
                e.stopPropagation();
                return true;
            }, true);
            refs.current.panorama = new google.maps.StreetViewPanorama(bodyRef.current, {
                addressControl: true,
                navigationControl: true,
                enableCloseButton: false,
            });
        }
    }, [mapLoaded]);

    useEffect(() =>{
        if (! mapLoaded) return;
        if (overlay){
            setStreetView(null);
        } else {
            setStreetView(refs.current.panorama);
        }
        showPanorama();
    }, [overlay, mapLoaded]);

    useEffect(() => {
        updatePath(selectedItem);
    }, [selectedItem, mapLoaded]);

    useEffect(() => {
        showPanorama();
    }, [panoramaIndex]);

    const setStreetView = (pnrm) => {
        if (context.state.map)
            context.state.map.setStreetView(pnrm);
    };
    const createPanoramaIndexButtonClickCB = d => () => dispatch(setPanoramaIndex(panoramaIndex + d));
    const panoramaIndexButtonClickCBs = {
        '-10': useCallback(createPanoramaIndexButtonClickCB(-10), [panoramaIndex]),
        '-1':  useCallback(createPanoramaIndexButtonClickCB(-1), [panoramaIndex]),
        '+1':  useCallback(createPanoramaIndexButtonClickCB(1), [panoramaIndex]),
        '+10': useCallback(createPanoramaIndexButtonClickCB(10), [panoramaIndex]),
    };
    return (
        <div>
            <div>
                <FormControlLabel
                    control={
                        <Switch
                            checked={overlay} onChange={handleOverlayChange} />}
                    label="overlay">
                </FormControlLabel>
            </div>
            { <Box sx={{ width: '100%', height: '30vh', display: overlay ? 'none' : 'block' }} ref={bodyRef}></Box>}
            <Box sx={{
                display: 'flex',
                flextDirection: 'row',
                width: '100%',
                textAlign: 'center',
                height: 36,
            }}>
                <IconButton onClick={panoramaIndexButtonClickCBs['-10']} size="large"><AvFastRewindIcon /></IconButton>
                <IconButton onClick={panoramaIndexButtonClickCBs['-1']} size="large"><NavigationArrowBackIcon /></IconButton>
                <Typography variant="body2" style={{ flexGrow: 1, }}><span>{ panoramaIndex+1 } </span> / <span>{ panoramaCount } </span></Typography>
                <IconButton onClick={panoramaIndexButtonClickCBs['+1']} size="large"><NavigationArrowForwardIcon /></IconButton>
                <IconButton onClick={panoramaIndexButtonClickCBs['+10']} size="large"><AvFastForwardIcon /></IconButton>
            </Box>
        </div>
    );
};

export default PanoramaBox;
