import React, { Component } from 'react';
import CssBaseline from '@material-ui/core/CssBaseline';
import NavBarContainer from './nav-bar';
import MapContainer from './map';
import BottomBarContainer from './bottom-bar';
import WalkEditorContainer from './walk-editor';
import GeocodeModalContainer from './geocode-modal';
import { connect } from 'react-redux';
import ContentBoxContainer from './content-box';
import { bindActionCreators } from 'redux';
import { openSnackbar, toggleView } from './actions';
import Snackbar from '@material-ui/core/Snackbar';
import Button from '@material-ui/core/Button';
import MenuIcon from '@material-ui/icons/Menu';
import { withStyles } from '@material-ui/core/styles';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';

const styles = theme => ({
    root: {
        height: '100%',
    },
    rootMap: {
        display: 'flex',
        flexDirection: 'column',
    },
});

class Body extends Component {
    handleRequestClose() {
        this.props.openSnackbar(false);
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
                <CssBaseline />
                <NavBarContainer />
                <MapContainer />
                <ContentBoxContainer />
                { view == 'map' && <BottomBarContainer /> }
                <WalkEditorContainer />
                <GeocodeModalContainer />
                <Snackbar
                    open={this.props.open_snackbar}
                    message={this.props.message}
                    autoHideDuration={4000}
                    onClose={this.handleRequestClose.bind(this)}
                />
            </div>
        );
    }
}

function mapStateToProps(state) {
    const { message, open_snackbar, view } = state.main;
    return { message, open_snackbar, view, };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({openSnackbar, toggleView}, dispatch);
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(Body)));
