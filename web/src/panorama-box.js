import React, { memo, useRef, useContext, useEffect } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { toggleView, setPanoramaCount, setPanoramaIndex, setOverlay } from './actions';
import IconButton from '@material-ui/core/IconButton';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Typography from '@material-ui/core/Typography';
import Switch from '@material-ui/core/Switch';
import NavigationArrowForwardIcon from '@material-ui/icons/ArrowForward';
import NavigationArrowBackIcon from '@material-ui/icons/ArrowBack';
import AvFastForwardIcon from '@material-ui/icons/FastForward';
import AvFastRewindIcon from '@material-ui/icons/FastRewind';
import MapContext from './map-context';
import { compareWithMapLoaded } from './utils';
import { makeStyles } from '@material-ui/styles';
import classNames from 'classnames';

const styles = {
    panoramaBoxBody: {
        width: '100%',
        height: '30vh'
    },
    panoramaBoxControl: {
        display: 'flex',
        flextDirection: 'row',
        width: '100%',
        textAlign: 'center',
        height: 36
    },
    panoramaBoxTitle: {
        float: 'left'
    },
    panoramaBoxOverlayToggle: {
        width: 120,
        float: 'right',
        marginTop: 40,
    },
    panoramaHidden: {
        display: 'none',
    },
};

const useStyles = makeStyles(styles);

const PANORAMA_INTERVAL = 50;

const PanoramaBox = props => {

    const bodyRef = useRef({});
    const {  setPanoramaCount, setPanoramaIndex, setOverlay } = props; 
    const {  highlightedPath,  panoramaIndex, panoramaCount, overlay, mapLoaded } = props;
    const classes = useStyles(props);
    const refs = useRef({});
    const handleOverlayChange = (e, toggled) => {
        setOverlay(toggled);
    };
    const interpolatePoints = (pt1, pt2, r) => {
        return {lat: r*pt2.lat() + (1-r)*pt1.lat(), lng: r*pt2.lng() + (1-r)*pt1.lng()};
    };
    const context = useContext(MapContext);
    const getPanoramaPointsAndHeadings = (highlightedPath) => {
        if (!highlightedPath) return null;
        const pph = [];
        const path = highlightedPath;
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

    const updatePath = (highlightedPath) => {
        if ( ! mapLoaded ) return;
        if (! highlightedPath) {
            const pnrm = overlay ? context.state.map.getStreetView() : refs.current.panorama;
            if (pnrm) {
                pnrm.setVisible(false);
            }
            setStreetView(null);
            return;
        }
        const path = google.maps.geometry.encoding.decodePath(highlightedPath);
        refs.current.panoramaPointsAndHeadings = getPanoramaPointsAndHeadings(path);
        setPanoramaCount(refs.current.panoramaPointsAndHeadings.length);
        // setTimeout(() => {this.props.setPanoramaIndex(0);}, 0);
        setPanoramaIndex(0);
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
        updatePath(highlightedPath);
    }, [highlightedPath, mapLoaded]);
  
    useEffect(() => {
        showPanorama();
    }, [panoramaIndex]);

    const setStreetView = (pnrm) => {
        if (context.state.map)
            context.state.map.setStreetView(pnrm);
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
            <div className={classNames(classes.panoramaBoxBody, {
                [classes.panoramaHidden]: overlay,
            })} ref={bodyRef}></div>
            <div className={classes.panoramaBoxControl}>
                <IconButton onClick={ () => { setPanoramaIndex(panoramaIndex - 10); } }><AvFastRewindIcon /></IconButton>
                <IconButton onClick={ () => { setPanoramaIndex(panoramaIndex - 1); }}><NavigationArrowBackIcon /></IconButton>
                <Typography variant="body2" style={{ flexGrow: 1 }}><span>{ panoramaIndex+1 } </span> / <span>{ panoramaCount } </span></Typography>
                <IconButton onClick={ () => { setPanoramaIndex(panoramaIndex + 1); }}><NavigationArrowForwardIcon /></IconButton>
                <IconButton onClick={ () => { setPanoramaIndex(panoramaIndex + 10); }}><AvFastForwardIcon /></IconButton>
            </div>
        </div>
    );  
};

function mapStateToProps(state) {
    const { view, highlightedPath, panoramaIndex, panoramaCount, overlay, mapLoaded } = state.main;
    return {
        view, highlightedPath,  panoramaIndex, panoramaCount, overlay, mapLoaded
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ toggleView, setPanoramaCount, setPanoramaIndex, setOverlay }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(memo(PanoramaBox, compareWithMapLoaded));
