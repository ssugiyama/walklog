import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import SearchFormContainer from './search-form';
import { connect } from 'react-redux';
import { setTabValue } from './actions';
import Drawer from 'material-ui/Drawer';
import AppBar from 'material-ui/AppBar';
import Tabs, { Tab } from 'material-ui/Tabs';
import SearchBox from './search-box';
import CommentBox from './comment-box';
import ElevationBox from './elevation-box';
import PanoramaBox from './panorama-box';
import Table, { TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn } from 'material-ui/Table';
import IconButton from 'material-ui/IconButton';
import NavigationClose from '@material-ui/icons/Close';
import SearchIcon from '@material-ui/icons/Search';
import DescriptionIcon from '@material-ui/icons/Description';
import VisibilityIcon from '@material-ui/icons/Visibility';
import { withStyles } from 'material-ui/styles';

const drawerWidth = 300;
const appBarHeight = 64;
const styles = {
    tab: {
        minWidth: drawerWidth/3,
    },
    drawerPaper: {  
        marginTop: appBarHeight,
        width: drawerWidth,
    },
};

class SideBox extends Component {
    constructor(props) {
        super(props);
    }
    handleTabChange(event, tab_value) {
        // if (typeof(tab_value) !== 'string') return;
        this.props.setTabValue(tab_value);
    }
    render() {
        return (
            <Drawer open={this.props.open_sidebar} variant="persistent" 
                classes={{ paper: this.props.classes.drawerPaper }}>
                <Tabs value={this.props.tab_value} onChange={this.handleTabChange.bind(this)}> 
                    indicatorColor="primary" textColor="primary" fullWidth>
                    <Tab icon={<SearchIcon />} value="search" className={this.props.classes.tab}/>
                    <Tab icon={<DescriptionIcon />} value="comment" disabled={!this.props.selected_item} className={this.props.classes.tab} />
                    <Tab icon={<VisibilityIcon />} value="visualization"  disabled={!this.props.highlighted_path} className={this.props.classes.tab} />
                </Tabs>
                { this.props.tab_value == "search" && <SearchBox /> }
                { this.props.tab_value == "comment" && <CommentBox /> }
                { this.props.tab_value == "visualization" && <div><ElevationBox /><PanoramaBox /></div>}
                <div style={{paddingBottom: appBarHeight}}></div>
            </Drawer>
        );
    }
}

function mapStateToProps(state) {
    return Object.assign({}, { open_sidebar: state.main.open_sidebar, highlighted_path: state.main.highlighted_path, selected_item: state.main.selected_item, tab_value: state.main.tab_value });
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ setTabValue }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(SideBox));
