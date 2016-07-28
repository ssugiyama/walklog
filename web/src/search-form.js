import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import 'whatwg-fetch';
import { connect } from 'react-redux';
import { setSearchForm, search} from './actions';
import { push } from 'react-router-redux'
import {browserHistory} from 'react-router'

class SearchForm extends Component {
    handleSubmit(e) {
	e.preventDefault();
	let keys = ['filter', 'year', 'month', 'order', 'limit'];
	switch (this.props.filter) {
	    case 'neighborhood':
		keys.push('radius', 'longitude', 'latitude');
		break;
	    case 'cities':
		keys.push('cities');
		break;
	    case 'crossing':
	    case 'hausdorff':
		keys.push('searchPath');
		break;
	}

	let query = {}
	keys.forEach(key => { query[key] = this.props[key] });
	console.log(keys);
	this.props.push({
	    query
	});
    }
    handleChange(e) {
	this.props.setSearchForm({[e.target.name]: e.target.value});
    }
    componentDidMount() {
	if (this.props.do_search) {
	    this.props.search(this.props);
	}
    }
    componentDidUpdate() {
	if (this.props.do_search) {
	    this.props.search(this.props);
	}
    }
    render() {   
	return (
	    <form className="form-horizontal" role="form" onSubmit={this.handleSubmit.bind(this)}>
		<input type="hidden" name="latitude" value="" />
		<input type="hidden" name="longitude" value="" />
		<input type="hidden" name="radius" value="" />
		<input type="hidden" name="cities" value=""  />
		<input type="hidden" name="searchPath" value=""  />
		<div id="filterBox" className="form-group">
		    <div className="col-xs-offset-1 col-xs-10">
			<select name="filter" className="form-control" value={this.props.filter} onChange={this.handleChange.bind(this)}>
			    <option value="any">Filter</option>
			    <option value="neighborhood">Neighborhood</option>
			    <option value="cities">Cities</option>
			    <option value="hausdorff">Hausdorff</option>
			    <option value="crossing">Crossing</option>
			</select>
		    </div>
		</div>
		<div className="form-group">
		    <div className="col-xs-offset-1 col-xs-5">
			<select className="form-control" name="month" value={this.props.month} onChange={this.handleChange.bind(this)}>
			    <option value="">Month</option>
			    <option value="1">Jan</option>
			    <option value="2">Feb</option>
			    <option value="3">Mar</option>
			    <option value="4">Apr</option>
			    <option value="5">May</option>
			    <option value="6">Jun</option>
			    <option value="7">Jul</option>
			    <option value="8">Aug</option>
			    <option value="9">Sep</option>
			    <option value="10">Oct</option>
			    <option value="11">Nov</option>
			    <option value="12">Dec</option>
			</select>
		    </div>
		    <div className="col-xs-5">
			<select className="form-control" name="year" value={this.props.year} onChange={this.handleChange.bind(this)}>
			    <option value="">Year</option>
			    {this.props.years.map(function (y) {
				return <option value={y} key={y}>{y}</option>;
			     })}			    
			</select>
		    </div>
		</div>
		<div className="form-group">
		    <div className="col-xs-offset-1 col-xs-6">
			<select name="order" className="form-control" value={this.props.order} onChange={this.handleChange.bind(this)}>
			    {(this.props.filter == 'hausdorff') ?
			    (
			    <option value="nearest_first">nearest first</option>
			    )
			    :
			     (<optgroup label="order">
				 <option value="newest_first">newest first</option>
				 <option value="oldest_first">oldest first</option>
				 <option value="longest_first">longest first</option>
				 <option value="shortest_first">shortest first</option>
				 <option value="easternmost_first">easternmost first</option>
				 <option value="westernmost_first">westernmost first</option>
				 <option value="southernmost_first">southernmost first</option>
				 <option value="northernmost_first">northernmost first</option>
			     </optgroup>
			     )
			    }
			</select>
		    </div>
		    <div className="col-xs-4">
			<input type="text" className="form-control" defaultValue={this.props.limit} onChange={this.handleChange.bind(this)}/>
		    </div>
		</div>
		<div  className="form-group">
		    <div className="col-xs-offset-2 col-xs-8">
			<button className="btn btn-primary"><span className="glyphicon glyphicon-search"></span>search</button>
			<input type="reset" value="reset" className="btn" />
		    </div>
		</div>
	    </form>
	);
    }
}


function mapStateToProps(state) {
    return Object.assign({}, state.main.search_form, { years: state.main.years, do_search: state.main.do_search });
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({setSearchForm, search, push}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(SearchForm);
