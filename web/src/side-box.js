import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import SearchFormContainer from './search-form';
import { connect } from 'react-redux';
import Drawer from 'material-ui/Drawer';
import AppBar from 'material-ui/AppBar';
import Tabs, { Tab } from 'material-ui/Tabs';
import Table, { TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn } from 'material-ui/Table';
import IconButton from 'material-ui/IconButton';
import NavigationClose from '@material-ui/icons/Close';
import SearchIcon from '@material-ui/icons/Search';
import DescriptionIcon from '@material-ui/icons/Description';
import NavBarContainer from './nav-bar';
import { withStyles } from 'material-ui/styles';
import { withRouter } from 'react-router-dom';
import { renderRoutes } from 'react-router-config';
import { routes } from './app';
import { toggleSidebar } from './actions';
import { push } from 'react-router-redux';

const drawerWidth = 300;

const styles = {
    drawerPaper: {  
        width: drawerWidth,
        overflowX: 'hidden',
        overflowY: 'hidden',
    },
};

class SideBox extends Component {
    constructor(props) {
        super(props);
    }
    componentDidUpdate(prevProps, prevState) {
        if (prevProps.location.search != '?force_fetch=1' && this.props.location.search == '?force_fetch=1') return;
        const keys = ['filter', 'user', 'year', 'month', 'order', 'limit'];
        switch (this.props.filter) {
        case 'neighborhood':
            keys.push('radius', 'longitude', 'latitude');
            break;
        case 'cities':
            keys.push('cities');
            break;
        case 'crossing':
        case 'hausdorff':
        case 'frechet':
            keys.push('searchPath');
            break;
        }
        const query = {};
        keys.forEach(key => { query[key] = this.props[key]; });
        if (keys.every(key => prevProps[key] == this.props[key])) return;
        const usp = new URLSearchParams(query);
        this.props.push({
            pathname: '/',
            search: usp.toString(),
        });
        if (this.props.open_sidebar) {
            if ( prevProps.filter != this.props.filter 
                && ( ['neighborhood', 'cities'].some(item => item == this.props.filter))
                  || ( ['hausdorff', 'crossing', 'frechet'].some(item => item == this.props.filter) && ! query.searchPath) ) {
                setTimeout(this.props.toggleSidebar.bind(this), 1000);
            }           
        }
        else {
            if (! (query.filter == 'cities' && ! query.cities) && 
                ! ((query.filter == 'crossing' || query.filter == 'hausdorff' || query.filter == 'frechet') && ! query.searchPath)) {
                setTimeout(this.props.toggleSidebar.bind(this), 1000);
            }
        }
    }
    render() {
        return (
            <Drawer open={this.props.open_sidebar} variant="persistent" 
                classes={{ paper: this.props.classes.drawerPaper }}>
                <NavBarContainer />
                { renderRoutes(routes) }
            </Drawer>
        );
    }
}

function mapStateToProps(state) {
    return Object.assign({}, state.main.search_form, { 
            open_sidebar: state.main.open_sidebar, 
            highlighted_path: state.main.highlighted_path, 
            selected_item: state.main.selected_item, 
            location: state.routing.location,
    });
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({  push, toggleSidebar }, dispatch);
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(SideBox)));
