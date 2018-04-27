import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import SearchFormContainer from './search-form';
import { connect } from 'react-redux';
import Drawer from 'material-ui/Drawer';
import AppBar from 'material-ui/AppBar';
import Tabs, { Tab } from 'material-ui/Tabs';
import SearchBox from './search-box';
import CommentBox from './comment-box';
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
    return Object.assign({}, { 
        open_sidebar: state.main.open_sidebar, 
        highlighted_path: state.main.highlighted_path, 
        selected_item: state.main.selected_item, 
    });
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ }, dispatch);
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(SideBox)));
