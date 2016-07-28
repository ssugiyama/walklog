import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { setAdditionalView } from './actions';
import marked from 'marked';

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
        let path = selected_path.getPath();
        let count = path.getLength();
        let way = 0;
        let dsum = 0;
	let pt2, h;
        for (let i= 0; i < count-1; i++) {
            let pt1 = path.getAt(i);
            pt2 = path.getAt(i+1);
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
	this.panoramaPointsAndHeadings = this.getPanoramaPointsAndHeadings(selected_path);
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
        this.props.setCenter(pt);
    }
    componentDidMount() {
        this.panorama = new google.maps.StreetViewPanorama(this.refs.body,
							   {
							       addressControl: true,
							       navigationControl: true,
							       enableCloseButton: true,
							   });
	this.props.setStreetView(this.panorama);
	this.initPanorama(this.props.selected_path);	
    }
    componentWillReceiveProps(nextProps) {
	this.initPanorama(nextProps.selected_path);
    }
    componentWillUnmount() {
//	this.props.setStreetView(null);
    }
    render() {
	return (
            <div id="panorama-box">
                <button className="close" onClick={this.handleClose.bind(this)}>&times;</button>
                <div className="body" ref="body"></div>
                <div className="controls">
                    <button className="btn btn-sm" onClick={ () => { this.showPanorama(this.state.panoramaIndex - 10) } }><span className="glyphicon glyphicon-fast-backward"></span></button>
                    <button className="btn btn-sm" onClick={ () => { this.showPanorama(this.state.panoramaIndex - 1) }}><span className="glyphicon glyphicon-step-backward"></span></button>
		<span className="label label-info"><span>{ this.state.panoramaIndex+1 } </span> / <span>{ this.state.panoramaCount } </span></span>
		    <button className="btn btn-sm" onClick={ () => { this.showPanorama(this.state.panoramaIndex + 1) }}><span className="glyphicon glyphicon-step-forward"></span></button>
                    <button className="btn btn-sm" onClick={ () => { this.showPanorama(this.state.panoramaIndex + 10) }}><span className="glyphicon glyphicon-fast-forward"></span></button>
                </div>
            </div>	    
	);
    }
}

function mapStateToProps(state) {
    return {
	selected_path: state.main.selected_path,
	showInfoWindow: state.main.component_procs.showInfoWindow,	
	hideInfoWindow: state.main.component_procs.hideInfoWindow,
	setStreetView: state.main.component_procs.setStreetView,
	setCenter: state.main.component_procs.setCenter,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ setAdditionalView }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(PanoramaBox);
