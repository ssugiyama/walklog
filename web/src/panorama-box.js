import React, { memo, useRef, useContext, useEffect } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { toggleView, setPanoramaCount, setPanoramaIndex, setOverlay } from './actions';
import IconButton from '@material-ui/core/IconButton';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Typography from '@material-ui/core/Typography';
import Switch from '@material-ui/core/Switch';
import NavigationArrowForward from '@material-ui/icons/ArrowForward';
import NavigationArrowBack from '@material-ui/icons/ArrowBack';
import AvFastForward from '@material-ui/icons/FastForward';
import AvFastRewind from '@material-ui/icons/FastRewind';
import MapContext from './map-context';
import { compare_with_map_loaded } from './utils';

// import { withStyles } from 'material-ui/styles';

const styles = {
    panoramaBoxBody: {
        width: '100%',
        height: '20vh'
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
};

const PANORAMA_INTERVAL = 50;

const PanoramaBox = props => {

    const body_ref = useRef();
    const {  setPanoramaCount, setPanoramaIndex, setOverlay } = props; 
    const {  highlighted_path,  panorama_index, panorama_count, overlay, map_loaded } = props;
    const refs = useRef();
    const handleOverlayChange = (e, toggled) => {
        setOverlay(toggled);
    };
    const interpolatePoints = (pt1, pt2, r) => {
        return {lat: r*pt2.lat() + (1-r)*pt1.lat(), lng: r*pt2.lng() + (1-r)*pt1.lng()};
    };
    const context = useContext(MapContext);
    const getPanoramaPointsAndHeadings = (highlighted_path) => {
        if (!highlighted_path) return null;
        const pph = [];
        const path = highlighted_path;
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

    const updatePath = (highlighted_path) => {
        if ( ! map_loaded ) return;
        if (! highlighted_path) {
            const pnrm = overlay ? context.state.map.getStreetView() : refs.panorama;
            if (pnrm) {
                pnrm.setVisible(false);
            }
            setStreetView(null);
            return;
        }
        const path = google.maps.geometry.encoding.decodePath(highlighted_path);
        refs.panoramaPointsAndHeadings = getPanoramaPointsAndHeadings(path);
        setPanoramaCount(refs.panoramaPointsAndHeadings.length);
        // setTimeout(() => {this.props.setPanoramaIndex(0);}, 0);
        setPanoramaIndex(0);
        showPanorama();
    };

    const showPanorama = () => {
        if ( !map_loaded || ! refs.panoramaPointsAndHeadings ) return;

        const index = panorama_index;
        const item = refs.panoramaPointsAndHeadings[index];
        const pt = item[0];
        const heading = item[1];
        const pnrm = overlay ? context.state.map.getStreetView() : refs.panorama;
        
        refs.streetViewService.getPanoramaByLocation(pt, 50, (data, status) => {
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
        if (map_loaded &&  !refs.panorama ) {
            refs.streetViewService = new google.maps.StreetViewService();
            refs.panorama = new google.maps.StreetViewPanorama(body_ref.current, {
                addressControl: true,
                navigationControl: true,
                enableCloseButton: false,
            });
        }
    }, [map_loaded]);

    useEffect(() =>{
        if (! map_loaded) return;
        if (overlay){
            setStreetView(null);
        } else {
            setStreetView(refs.panorama);
        }
        showPanorama();
    }, [overlay]);

    useEffect(() => {
        updatePath(highlighted_path);
    }, [highlighted_path, map_loaded]);
  
    useEffect(() => {
        showPanorama();
    }, [panorama_index]);

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
            <div style={styles.panoramaBoxBody} ref={body_ref}></div>
            <div style={styles.panoramaBoxControl}>
                <IconButton onClick={ () => { setPanoramaIndex(panorama_index - 10); } }><AvFastRewind /></IconButton>
                <IconButton onClick={ () => { setPanoramaIndex(panorama_index - 1); }}><NavigationArrowBack /></IconButton>
                <Typography variant="body2" style={{ flexGrow: 1 }}><span>{ panorama_index+1 } </span> / <span>{ panorama_count } </span></Typography>
                <IconButton onClick={ () => { setPanoramaIndex(panorama_index + 1); }}><NavigationArrowForward /></IconButton>
                <IconButton onClick={ () => { setPanoramaIndex(panorama_index + 10); }}><AvFastForward /></IconButton>
            </div>
        </div>
    );  
};

function mapStateToProps(state) {
    const { view, highlighted_path, panorama_index, panorama_count, overlay, map_loaded } = state.main;
    return {
        view, highlighted_path,  panorama_index, panorama_count, overlay, map_loaded
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ toggleView, setPanoramaCount, setPanoramaIndex, setOverlay }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(memo(PanoramaBox, compare_with_map_loaded));
