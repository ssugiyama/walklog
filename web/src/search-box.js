import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import SearchFormContainer from './search-form';
import { connect } from 'react-redux';
import { getMoreAction, setAdditionalView, setSelectedItem, setSelectedIndex, setTabValue } from './actions';
import {Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn} from 'material-ui/Table';
import FlatButton from 'material-ui/FlatButton';
import Toggle from 'material-ui/Toggle';

const td_common_style = {
    paddingLeft: 2,
    paddingRight: 2,
};

const td_styles = [
    Object.assign({}, td_common_style, { width: 32, textAlign: 'right' }),
    Object.assign({}, td_common_style, { width: 80 }),
    td_common_style,
    Object.assign({}, td_common_style, { width: 40, textAlign: 'right'})
];

class SearchBox extends Component {
    constructor(props) {
	super(props);
	this.state = {show_distance: false};
    }
    handleShowAll() {
	this.props.rows.forEach( row => this.props.path_manager.showPath(row.path, false) );
    }
    handleGetMore() {
	this.props.getMoreAction(this.props.params);
    }
    autoShowPaths() {
	if (this.props.show_on_map == 'all') {
	    this.handleShowAll();
	}
	else if (this.props.show_on_map == 'first' && this.props.rows.length > 0) {
	    this.handleSelect([0]);
	}
	else {
	    this.props.setSelectedIndex(-1);		    
	}
    }
    handleSelect(selectedRows) {
	if (selectedRows.length == 0) return;
	let index = selectedRows[0];
	let item = this.props.rows[index];
	this.props.setSelectedItem(item);
	this.props.setSelectedIndex(index);
	this.props.path_manager.showPath(item.path, true);
	this.props.setTabValue('comment');
    }

    componentDidUpdate(props) {
//	var w = $('.side').innerWidth() - $('td.id').outerWidth() - $('td.date').outerWidth() - $('td.way').outerWidth() - 20;
//	$('td.name div').outerWidth(w - 6);
	this.autoShowPaths();
    }
    handleShowDistance(e) {
	this.setState({show_distance: e.target.checked});
    }
    render() {   
	return (
	    <div className="sidebar">
		<SearchFormContainer />
		<div>
		    <strong>
			{
			    ( () => {
				switch (this.props.count) {
				    case null:
					return <span>successfully saved</span>;
				    case 0:
					return <span>No results</span>;
				    case 1:
					return <span>1 / 1 item</span>;
				    default: 
					return <span>{this.props.rows.length}  / {this.props.count}  items</span>;
				}
			    })()
			}
			
		    </strong> :
	    { this.props.rows.length > 0 ? (<FlatButton onTouchTap={ this.handleShowAll.bind(this) } label="show all paths" />) : null }
	    { this.props.rows.length > 0 && this.props.rows[0].distance !== undefined ? 
	      <Toggle
		  label="show hausdorff distance" toggled={this.state.show_distance} onToggle={this.handleShowDistance.bind(this)} /> : null }
		</div>
		<Table onRowSelection={this.handleSelect.bind(this)} style={{cursor: 'pointer'}}>
		    <TableBody stripedRows  displayRowCheckbox={false}>
			{ this.props.rows.map( (item, index) => 
			    <TableRow key={index}>
				<TableRowColumn style={td_styles[0]} className="hidden-xs id">{index+1}</TableRowColumn>
				<TableRowColumn style={td_styles[1]} className="date">{item.date}</TableRowColumn>
				<TableRowColumn style={td_styles[2]} className="name"><div>{item.title}</div></TableRowColumn>
				<TableRowColumn style={td_styles[3]} className="way">{this.state.show_distance && item.distance !== undefined ? item.distance.toFixed(1) : item.length.toFixed(1)}</TableRowColumn>
			    </TableRow>)
			}
		    </TableBody>
		</Table>
		{ this.props.params ? <FlatButton style={{width: '100%'}} onTouchTap={this.handleGetMore.bind(this)} label="more" /> : null }
	    </div>
	);
    }
}

function mapStateToProps(state) {
    return Object.assign({}, state.main.result, { path_manager: state.main.path_manager, show_on_map: state.main.show_on_map, resizeMap: state.main.component_procs.resizeMap });
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ getMoreAction, setAdditionalView, setSelectedItem, setSelectedIndex, setTabValue}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(SearchBox);
