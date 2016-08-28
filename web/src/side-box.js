import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import SearchFormContainer from './search-form';
import { connect } from 'react-redux';
import { getMoreItems, setAdditionalView, setSelectedItem, setSelectedIndex, setTabValue } from './actions';
import Drawer from 'material-ui/Drawer';
import AppBar from 'material-ui/AppBar';
import {Tabs, Tab} from 'material-ui/Tabs';
import SearchBox from './search-box';
import CommentBox from './comment-box';
import ElevationBox from './elevation-box';
import PanoramaBox from './panorama-box';
import {Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn} from 'material-ui/Table';
import IconButton from 'material-ui/IconButton';
import NavigationClose from 'material-ui/svg-icons/navigation/close';
import SearchIcon from 'material-ui/svg-icons/action/search';
import DescriptionIcon from 'material-ui/svg-icons/action/description';
import VisibilityIcon from 'material-ui/svg-icons/action/visibility';
import styles from './styles';

const closeButtonStyle = {
    position: 'absolute',
    left: -10,
    top: -10,
};
class SideBox extends Component {
    constructor(props) {
	super(props);
    }
    handleTabChange(tab_value) {
	if (typeof(tab_value) !== 'string') return;
        this.props.setTabValue(tab_value);
    }
    render() {
	return (
 	    <Drawer open={this.props.open_sidebar} width={300} containerStyle={styles.sideBox}>
		<Tabs value={this.props.tab_value} onChange={this.handleTabChange.bind(this)}   style={styles.tabs}>
		    <Tab icon={<SearchIcon />} value="search" >
			<SearchBox />
		    </Tab>
		    <Tab icon={<DescriptionIcon />} value="comment" disabled={!this.props.selected_item}><CommentBox /></Tab>
		    <Tab icon={<VisibilityIcon />} value="visualization"  disabled={!this.props.selected_path}>
			<ElevationBox />
			<PanoramaBox />
		    </Tab>
		</Tabs>
	    </Drawer>
	);
    }
}

function mapStateToProps(state) {
    return Object.assign({}, { open_sidebar: state.main.open_sidebar, selected_path: state.main.selected_path, selected_item: state.main.selected_item, tab_value: state.main.tab_value });
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ setTabValue }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(SideBox);
