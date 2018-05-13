import React, { Component } from 'react';
import CssBaseline from 'material-ui/CssBaseline';
import MapContainer from './map';
import BottomBarContainer from './bottom-bar';
import WalkEditorContainer from './walk-editor';
import GeocodeModalContainer from './geocode-modal';
import { connect } from 'react-redux';
import SideBoxContainer from './side-box';
import { bindActionCreators } from 'redux';
import { openSnackbar, toggleSidebar } from './actions';
import Snackbar from 'material-ui/Snackbar';
import Button from 'material-ui/Button';
import MenuIcon from '@material-ui/icons/Menu';
import { withStyles } from 'material-ui/styles';
import { withRouter } from 'react-router-dom';
import withWidth from 'material-ui/utils/withWidth';
import compose from 'recompose/compose';
import classNames from 'classnames';
import constants from './constants';

const styles = theme => ({
    main: {
        display: 'flex',
        height: '100%',
        [theme.breakpoints.up('sm')]: {
            flexDirection: 'row',
        },
        [theme.breakpoints.up('xs')]: {
            flexDirection: 'column',
        },
    },
    mapBox: {
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        flexGrow: 1,
        height: '100%',
        marginLeft: 0,
        marginTop: 0,
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
    },
    mapBoxRight: {
        marginTop: 0,
        marginLeft: constants.sideBoxWidth,
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
        }),
    },
    mapBoxBottom: {
        marginLeft: 0,
        marginTop: constants.sideBoxHeight,
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
        }),
    },
    drawerButton: {
        position: 'absolute',
        marginTop: 'env(safe-area-inset-top)',
        top: 5,
        left: 20,
    },
});

class Body extends Component {
    handleRequestClose() {
        this.props.openSnackbar(false);
    }
    handleShow() {
        this.props.toggleSidebar();
    }
    render() {
        const {classes, width, open_sidebar} = this.props;
        return (
            <div>
                <CssBaseline />
                <main className={classes.main}>
                    <SideBoxContainer />
                    <div className={classNames(classes.mapBox, {
                        [classes.mapBoxRight]: open_sidebar && width != 'xs',
                        [classes.mapBoxBottom]: open_sidebar && width == 'xs',
                    })}>
                        <MapContainer />
                        { (! open_sidebar || width != 'xs') &&  <BottomBarContainer /> }
                    </div>
                </main>
                <Button variant="fab" color="primary" onClick={this.handleShow.bind(this)} className={classes.drawerButton}>
                    <MenuIcon />
                </Button>
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
    return { message: state.main.message, open_snackbar: state.main.open_snackbar, open_sidebar: state.main.open_sidebar, };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({openSnackbar, toggleSidebar}, dispatch);
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(compose(withStyles(styles), withWidth())(Body)));
