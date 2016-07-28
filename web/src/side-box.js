import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import SearchFormContainer from './search-form';
import { connect } from 'react-redux';
import { getMoreAction, setAdditionalView, setSelectedItem, setSelectedIndex } from './actions';

class SideBox extends Component {
    constructor(props) {
	super(props);
	this.state = {show_distance: false};
    }
    handleShowPath(item, index) {
	this.props.path_manager.showPath(item.path, true);
	this.props.setSelectedItem(item);
	this.props.setSelectedIndex(index);	
	this.props.setAdditionalView('comment');
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
	    this.handleShowPath(this.props.rows[0], 0);
	}
	else {
	    this.props.setSelectedIndex(-1);		    
	}
    }
    handleResize() {
	$(this.refs.root).outerHeight($(window).height() - $('.navbar-header').height());
    }
    componentDidMount() {
	this.handleResize();
	window.addEventListener('resize', this.handleResize.bind(this));
    }
    componentDidUpdate(props) {
	var w = $('.side').innerWidth() - $('td.id').outerWidth() - $('td.date').outerWidth() - $('td.way').outerWidth() - 20;
	$('td.name div').outerWidth(w - 6);
	this.autoShowPaths();
    }
    toggleSide() {
	$(this.refs.root).parent().toggleClass('open');
	
	setTimeout(this.props.resizeMap, 500);
    }
    handleShowDistance(e) {
	this.setState({show_distance: e.target.checked});
    }
    render() {   
	return (
	    <div className="panel side" ref="root">
		<div className="controls">
		<a href="javascript:void(0);" aria-foldedopen="false" aria-controls="side" className="btn btn-primary btn-sm" onClick={this.toggleSide.bind(this)}><span className="glyphicon glyphicon-chevron-left" aria-hidden="true"></span></a>
		</div>	    
		<div className="sidebar">
		    <SearchFormContainer />
		    <p id="message" className="well well-sm col-xs-offset-1 col-xs-10">
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
	    { this.props.rows.length > 0 ? (<button onClick={ this.handleShowAll.bind(this) } className="btn" ><span className="glyphicon glyphicon-map-marker" ></span>show all</button>) : null }
	    { this.props.rows.length > 0 && this.props.rows[0].distance !== undefined ? (<label className="radio-inline">
											 <input  type="checkbox" name="show_distance" value={this.state.show_distance} onChange={this.handleShowDistance.bind(this)} />show hausdorff distance</label>) : null }
		    </p>
		    <div className="table-wrapper">
			<table className="table table-condensed table-striped table-hover">
			    <tbody id="tbody">
				{ this.props.rows.map( (item, index) => 
						       <tr onClick={ this.handleShowPath.bind(this, item, index)} key={index}>
				    <td className="hidden-xs id">{index+1}</td>
				    <td className="date">{item.date}</td>
				    <td className="name"><div>{item.title}</div></td><td className="way">{this.state.show_distance && item.distance !== undefined ? item.distance.toFixed(1) : item.length.toFixed(1)}</td>
				</tr>)
				}
			    </tbody>
			</table>
		    </div>
		    { this.props.params ? <button className="btn btn-primary btn-more col-xs-offset-3 col-xs-6" onClick={this.handleGetMore.bind(this)}>more</button> : null }
		</div>
	    </div>
	);
    }
}

function mapStateToProps(state) {
    return Object.assign({}, state.main.result, { path_manager: state.main.path_manager, show_on_map: state.main.show_on_map, resizeMap: state.main.component_procs.resizeMap });
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ getMoreAction, setAdditionalView, setSelectedItem, setSelectedIndex }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(SideBox);
