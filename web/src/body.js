import React, { Component } from 'react';
import CssBaseline from '@material-ui/core/CssBaseline';
import NavBarContainer from './nav-bar';
import MapContainer from './map';
import BottomBarContainer from './bottom-bar';
import WalkEditorContainer from './walk-editor';;
import { connect } from 'react-redux';
import ContentBoxContainer from './content-box';
import { bindActionCreators } from 'redux';
import { openSnackbar, toggleView } from './actions';
import Snackbar from '@material-ui/core/Snackbar';
import { withStyles } from '@material-ui/core/styles';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';
import NoSsr from '@material-ui/core/NoSsr';
import MapContext from './map-context';

const styles = theme => ({
    root: {
        height: '100%',
    },
    rootMap: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
    },
});

class Body extends Component {
    constructor(props) {
        super(props);
        this.state = {mapContext: {map: null, setMap: this.setMap.bind(this)}};
    }
    setMap(map, public_procs) {
        const newContext = Object.assign({}, this.state.mapContext, {map, ...public_procs});
        this.setState({mapContext: newContext});
    }
    handleRequestClose() {
        this.props.openSnackbar(null);
    }
    handleShow() {
        this.props.toggleView();
    }
    render() {
        const {classes, width, view} = this.props;
        return (
            <div className={classNames(
                classes.root,
                {
                    [classes.rootMap]: view == 'map',
                }
            )}>
                <MapContext.Provider value={this.state.mapContext}>
                    <CssBaseline />
                    <NavBarContainer />
                    <NoSsr>
                        <MapContainer />
                    </NoSsr>
                    <ContentBoxContainer />
                    { view == 'map' && <BottomBarContainer /> }
                    <WalkEditorContainer />
                    <Snackbar
                        open={this.props.message != null}
                        message={this.props.message}
                        autoHideDuration={4000}
                        onClose={this.handleRequestClose.bind(this)}
                    />
                </MapContext.Provider>
            </div>
        );
    }
}

function mapStateToProps(state) {
    const { message, view } = state.main;
    return { message, view };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({openSnackbar, toggleView}, dispatch);
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(Body)));
