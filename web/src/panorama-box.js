import React, { Component } from 'react';
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

// import { withStyles } from 'material-ui/styles';

const styles = {
    panoramaBoxBody: {
        width: '100%',
        height: 214
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

class PanoramaBox extends Component {
    constructor(props) {
        super(props);
        this.panoramaInterval = 50;
        this.body_ref = React.createRef();
    }
    handleOverlayChange(e, toggled) {
        this.props.setOverlay(toggled);
    }
    interpolatePoints(pt1, pt2, r) {
        return {lat: r*pt2.lat() + (1-r)*pt1.lat(), lng: r*pt2.lng() + (1-r)*pt1.lng()};
    }
    getPanoramaPointsAndHeadings(highlighted_path) {
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
                const pt = this.interpolatePoints(pt1, pt2, (way - dsum)/d);
                pph.push([pt, h]);
                way += this.panoramaInterval;
            }
            dsum += d;
        }
        pph.push([pt2, h]);
        return pph;

    }
    updatePath(highlighted_path) {
        if (! highlighted_path) {
            const panorama = this.props.overlay ? this.props.map.getStreetView() : this.panorama;
            if (panorama) {
                panorama.setVisible(false);
            }
            this.setStreetView(null);
            return;
        }
        const path = google.maps.geometry.encoding.decodePath(highlighted_path);
        this.panoramaPointsAndHeadings = this.getPanoramaPointsAndHeadings(path);
        this.props.setPanoramaCount(this.panoramaPointsAndHeadings.length);
        // setTimeout(() => {this.props.setPanoramaIndex(0);}, 0);
        this.props.setPanoramaIndex(0);
    }
    showPanorama() {
        const index = this.props.panorama_index;
        const item = this.panoramaPointsAndHeadings[index];
        const pt = item[0];
        const heading = item[1];
        const panorama = this.props.overlay ? this.props.map.getStreetView() : this.panorama;
        this.streetViewService.getPanoramaByLocation(pt, 50, (data, status) => {
            if (status == google.maps.StreetViewStatus.OK) {
                panorama.setPano(data.location.pano);
                panorama.setPov({heading: heading, zoom: 1, pitch: 0});
                panorama.setVisible(true);
            }
            else {
                panorama.setVisible(false);
            }
        });
        google.maps.event.trigger(panorama, 'resize');
    }
    shouldComponentUpdate(nextProps, nextState) {
        if (nextProps.highlighted_path != this.props.highlighted_path) return true;
        if (nextProps.panorama_index != this.props.panorama_index) return true;
        if (nextProps.panorama_count != this.props.panorama_count) return true;
        if (nextProps.overlay != this.props.overlay) return true;
        if (nextProps.map != this.props.map) return true;
        return false;
    }
    updatePanorama(pathUpdated) {
        if ( !this.props.map ) return;
        if ( !this.panorama ) {
            this.streetViewService = new google.maps.StreetViewService();
            this.panorama = new google.maps.StreetViewPanorama(this.body_ref.current, {
                addressControl: true,
                navigationControl: true,
                enableCloseButton: false,
            });
        }
        if ( pathUpdated ) {
            this.updatePath(this.props.highlighted_path);
        }
        if (this.props.overlay){
            this.setStreetView(null);
        } else {
            this.setStreetView(this.panorama);
        }
        this.showPanorama();
    }
    componentDidMount() {
        this.updatePanorama(true);
    }
    componentDidUpdate(prevProps) {
        const pathUpdated = !prevProps.map || prevProps.highlighted_path != this.props.highlighted_path;
        this.updatePanorama(pathUpdated);
    }
    componentWillUnmount() {
        this.setStreetView(null);
    }
    setStreetView(panorama) {
        this.props.map.setStreetView(panorama);
    }
    render() {
        return (
            <div>
                <div>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={this.props.overlay} onChange={this.handleOverlayChange.bind(this)} />}
                        label="overlay">
                    </FormControlLabel>
                </div>
                <div style={styles.panoramaBoxBody} ref={this.body_ref}></div>
                <div style={styles.panoramaBoxControl}>
                    <IconButton onClick={ () => { this.props.setPanoramaIndex(this.props.panorama_index - 10); } }><AvFastRewind /></IconButton>
                    <IconButton onClick={ () => { this.props.setPanoramaIndex(this.props.panorama_index - 1); }}><NavigationArrowBack /></IconButton>
                    <Typography variant="body2" style={{ flexGrow: 1 }}><span>{ this.props.panorama_index+1 } </span> / <span>{ this.props.panorama_count } </span></Typography>
                    <IconButton onClick={ () => { this.props.setPanoramaIndex(this.props.panorama_index + 1); }}><NavigationArrowForward /></IconButton>
                    <IconButton onClick={ () => { this.props.setPanoramaIndex(this.props.panorama_index + 10); }}><AvFastForward /></IconButton>
                </div>
            </div>
        );
    }
}

function mapStateToProps(state) {
    const { view, highlighted_path, panorama_index, panorama_count, overlay, map } = state.main;
    return {
        view, highlighted_path,  panorama_index, panorama_count, overlay, map
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ toggleView, setPanoramaCount, setPanoramaIndex, setOverlay }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(PanoramaBox);
