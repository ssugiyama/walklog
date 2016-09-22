import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import 'whatwg-fetch';
import { connect } from 'react-redux';
import { setSearchForm, search} from './actions';
import { push } from 'react-router-redux'
import {browserHistory} from 'react-router'
import FlatButton from 'material-ui/FlatButton';
import SearchIcon from 'material-ui/svg-icons/action/search';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import TextField from 'material-ui/TextField';

const month_options = [
    { label: '-', value: '' },
    { label: 'Jan', value: 1 },
    { label: 'Feb', value: 2 },
    { label: 'Mar', value: 3 },
    { label: 'Apr', value: 4 },
    { label: 'May', value: 5 },
    { label: 'Jun', value: 6 },
    { label: 'Jul', value: 7 },
    { label: 'Aug', value: 8 },
    { label: 'Sep', value: 9 },
    { label: 'Oct', value: 10 },
    { label: 'Nov', value: 11 },
    { label: 'Dec', value: 12 },
];

const order_options  = [
    { label: 'newest first', value: 'newest_first' },
    { label: 'oldest first', value: 'oldest_first' },
    { label: 'longest first', value: 'longest_first' },
    { label: 'shortest first', value: 'shortest_first' },
    { label: 'northernmost first', value: 'northernmost_first' },
    { label: 'southernmostest first', value: 'southernmost_first' },
    { label: 'easternmost first', value: 'easternmost_first' },
    { label: 'westernmost first', value: 'westernmost_first' },
];

const order_options_hausdorff = [
    { label: 'nearest first', value: 'nearest_first' },
];

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
        this.props.push({
            query
        });
    }
    handleSelectChange(name, e, index, value) {
        this.props.setSearchForm({[name]: value});
    }
    handleTextChange(name, e) {
        this.props.setSearchForm({[name]: e.target.value});
    }
    searchDisabled() {
        if ((this.props.filter == 'hausdorff' || this.props.filter == 'crossing') && !this.props.searchPath) return true;
        else if (this.props.filter == 'cities' && !this.props.cities) return true;
        else return false;
    }
    render() {
        return (
            <form className="form-horizontal" role="form" onSubmit={this.handleSubmit.bind(this)}>
                <input type="hidden" name="latitude" value="" />
                <input type="hidden" name="longitude" value="" />
                <input type="hidden" name="radius" value="" />
                <input type="hidden" name="cities" value=""  />
                <input type="hidden" name="searchPath" value=""  />
                <div>
                    <SelectField id="search_form_filter" floatingLabelText="filter" value={this.props.filter} onChange={this.handleSelectChange.bind(this, 'filter')} fullWidth={true}>
                        <MenuItem value="any" primaryText="any" />
                        <MenuItem value="neighborhood" primaryText="Neighborhood" />
                        <MenuItem value="cities" primaryText="Cities" />
                        <MenuItem value="hausdorff" primaryText="Hausdorff" />
                        <MenuItem value="crossing" primaryText="Crossing" />
                    </SelectField>
                </div>
                <div>
                    <SelectField id="search_form_month" floatingLabelText="month" floatingLabelFixed={true} value={parseInt(this.props.month) || ''} onChange={this.handleSelectChange.bind(this, 'month')} style={{width: "50%"}}>
                        {month_options.map(function (option) {
                             return <MenuItem value={option.value} key={option.value} primaryText={option.label} />
                         })}
                    </SelectField>
                    <SelectField id="search_form_year" floatingLabelText="year" floatingLabelFixed={true} value={parseInt(this.props.year) || ''} onChange={this.handleSelectChange.bind(this, 'year')} style={{width: "50%"}}>
                        <MenuItem value="" primaryText="-" />
                        {this.props.years.map(function (y) {
                             return <MenuItem value={y} key={y} primaryText={y} />
                         })}
                    </SelectField>
                </div>
                <div>
                    <SelectField id="search_form_order" floatingLabelText="order" value={this.props.order} onChange={this.handleSelectChange.bind(this, 'order')} style={{width: "50%", verticalAlign: 'bottom'}}>
                        {
                            (this.props.filter == 'hausdorff' ? order_options_hausdorff : order_options).map(option =>
                                <MenuItem value={option.value} key={option.value} primaryText={option.label} />
                            )
                        }
                    </SelectField>
                    <TextField id="search_form_limit" floatingLabelText="limit" floatingLabelFixed={true} value={this.props.limit} onChange={this.handleTextChange.bind(this, 'limit')} style={{width: "50%"}} />
                </div>
                <div style={{textAlign: 'center'}}>
                    <FlatButton label="search" primary={true} type="submit" icon={<SearchIcon />} />
                    <FlatButton type="reset" secondary={true} label="reset" />
                </div>
            </form>
        );
    }
}


function mapStateToProps(state) {
    return Object.assign({}, state.main.search_form, { years: state.main.years });
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({setSearchForm, search, push}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(SearchForm);
