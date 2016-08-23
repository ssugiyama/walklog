import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { setStreetView } from './actions';
import IconButton from 'material-ui/IconButton';
import NavigationArrowForward from 'material-ui/svg-icons/navigation/arrow-forward';
import NavigationArrowBack from 'material-ui/svg-icons/navigation/arrow-back';
import AvFastForward from 'material-ui/svg-icons/av/fast-forward';
import AvFastRewind from 'material-ui/svg-icons/av/fast-rewind';
import styles from './styles';

class PanoramaBox extends Component {
    constructor(props) {
	super(props);
        this.streetViewService = new google.maps.StreetViewService();
	this.panoramaInterval = 50;
	this.state = {
	    panoramaIndex: 0,
	    panoramaCount: 0
	}
    }
    handleClose() {
	this.props.setAdditionalView(null);
    }
    interpolatePoints(pt1, pt2, r) {
        return new google.maps.LatLng(r*pt2.lat() + (1-r)*pt1.lat(), r*pt2.lng() + (1-r)*pt1.lng());
    }
    getPanoramaPointsAndHeadings(selected_path) {
        if (!selected_path) return null;
        let pph = [];
        let path = selected_path;
        let count = path.length;
        let way = 0;
        let dsum = 0;
	let pt2, h;
        for (let i= 0; i < count-1; i++) {
            let pt1 = path[i];
            pt2 = path[i+1];
            let d = google.maps.geometry.spherical.computeDistanceBetween(pt1, pt2);
            h = google.maps.geometry.spherical.computeHeading(pt1, pt2);

            while(way < dsum+d ) {
                let pt = this.interpolatePoints(pt1, pt2, (way - dsum)/d);
                pph.push([pt, h]);
                way += this.panoramaInterval;
            }
            dsum += d;
        }
        pph.push([pt2, h]);
        return pph;

    }
    initPanorama(selected_path) {
	if (! selected_path) return;
	let path = google.maps.geometry.encoding.decodePath(selected_path);
	this.panoramaPointsAndHeadings = this.getPanoramaPointsAndHeadings(path);
	this.setState({panoramaCount: this.panoramaPointsAndHeadings.length});
	setTimeout(() => {this.showPanorama(0)}, 0);
    }
    showPanorama(index) {
        if (index < 0) index = 0;
        else if(index >=  this.state.panoramaCount) index = this.state.panoramaCount -1;

	this.setState({panoramaIndex: index});
        var item = this.panoramaPointsAndHeadings[index];
        var pt = item[0];
        var heading = item[1];
        this.streetViewService.getPanoramaByLocation(pt, 50, (data, status) => {
            if (status == google.maps.StreetViewStatus.OK) {
                this.panorama.setPano(data.location.pano);
                this.panorama.setPov({heading: heading, zoom: 1, pitch: 0});
                this.panorama.setVisible(true);
            }
            else {
                this.panorama.setVisible(false);
            }
        });
	google.maps.event.trigger(this.panorama, 'resize');
    }
    shouldComponentUpdate(nextProps, nextState) {
	if (nextProps.selected_path != this.props.selected_path) return true;
	if (nextState.panoramaIndex != this.state.panoramaIndex) return true;
	if (nextState.panoramaCount != this.state.panoramaCount) return true;
	return false;
    }
    componentDidMount() {
        this.panorama = new google.maps.StreetViewPanorama(this.refs.body,
							   {
							       addressControl: true,
							       navigationControl: true,
							       enableCloseButton: true,
							   });
	this.props.setStreetView(this.panorama);
    }
    componentWillReceiveProps(nextProps) {
	if (nextProps.selected_path != this.props.selected_path) {
	    this.initPanorama(nextProps.selected_path);
	}
    }
    render() {
	return (
            <div>
                <div style={styles.panoramaBoxBody} ref="body"></div>
                <div style={styles.panoramaBoxControl}>
                    <IconButton onTouchTap={ () => { this.showPanorama(this.state.panoramaIndex - 10) } }><AvFastRewind /></IconButton>
                    <IconButton onTouchTap={ () => { this.showPanorama(this.state.panoramaIndex - 1) }}><NavigationArrowBack /></IconButton>
		<span className="label label-info"><span>{ this.state.panoramaIndex+1 } </span> / <span>{ this.state.panoramaCount } </span></span>
		    <IconButton onTouchTap={ () => { this.showPanorama(this.state.panoramaIndex + 1) }}><NavigationArrowForward /></IconButton>
                    <IconButton onTouchTap={ () => { this.showPanorama(this.state.panoramaIndex + 10) }}><AvFastForward /></IconButton>
                </div>
            </div>
	);
    }
}

function mapStateToProps(state) {
    return {
	selected_path: state.main.selected_path,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ setStreetView }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(PanoramaBox);
