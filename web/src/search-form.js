import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import 'whatwg-fetch';
import { connect } from 'react-redux';
import { setSearchForm, resetSearchForm, search, toggleSidebar, setTabValue} from './actions';
import FlatButton from 'material-ui/FlatButton';
import SearchIcon from 'material-ui/svg-icons/action/search';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import TextField from 'material-ui/TextField';
import IconButton from 'material-ui/IconButton';
import NavigationRefresh from 'material-ui/svg-icons/navigation/refresh';

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
    constructor(props) {
        super(props);
        this.state = {force_search: false};
    }
    componentDidUpdate(prevProps, prevState) {
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
            keys.push('searchPath');
            break;
        }
        if (!this.state.force_search && keys.every(key => prevProps[key] == this.props[key])) return;
        this.setState({force_search: false});
        const query = {};
        keys.forEach(key => { query[key] = this.props[key]; });
        this.props.search(query, false);
        this.props.setTabValue('search');
        if (this.props.open_sidebar) {
            if ( prevProps.filter != this.props.filter 
                && ['neighborhood', 'cities', 'hausdorff', 'crossing'].some(item => item == this.props.filter)) {
                setTimeout(this.props.toggleSidebar.bind(this), 1000);
            }           
        }
        else {
            if (! (query.filter == 'cities' && ! query.cities) && 
                ! ((query.filter == 'crossing' || query.filter == 'hausdorff') && ! query.searchPath)) {
                setTimeout(this.props.toggleSidebar.bind(this), 1000);
            }
        }
    }
    handleSelectChange(name, e, index, value) {
        this.props.setSearchForm({[name]: value});
    }
    handleTextChange(name, e) {
        this.props.setSearchForm({[name]: e.target.value});
    }
    reset() {
        this.props.resetSearchForm();
        this.setState({force_search: true});
    }
    render() {
        return (
            <form className="form-horizontal" role="form">
                <input type="hidden" name="latitude" value="" />
                <input type="hidden" name="longitude" value="" />
                <input type="hidden" name="radius" value="" />
                <input type="hidden" name="cities" value=""  />
                <input type="hidden" name="searchPath" value=""  />
                <div>
                    <SelectField id="search_form_filter" floatingLabelText="filter" value={this.props.filter} onChange={this.handleSelectChange.bind(this, 'filter')} style={{width: '80%'}}>
                        <MenuItem value="any" primaryText="any" />
                        <MenuItem value="neighborhood" primaryText="Neighborhood" />
                        <MenuItem value="cities" primaryText="Cities" />
                        <MenuItem value="hausdorff" primaryText="Hausdorff" />
                        <MenuItem value="crossing" primaryText="Crossing" />
                    </SelectField>
                    <IconButton onTouchTap={this.reset.bind(this)}><NavigationRefresh /></IconButton>
                </div>
                <div>
                    <SelectField id="search_form_user" floatingLabelText="user" value={this.props.user} onChange={this.handleSelectChange.bind(this, 'user')}>
                        <MenuItem value="" primaryText="-" />
                        {this.props.users.map(function (u) {
                             return <MenuItem value={u.id} primaryText={u.username} />;
                         })}
                    </SelectField>
                </div>
                <div>
                    <SelectField id="search_form_month" floatingLabelText="month" floatingLabelFixed={true} value={parseInt(this.props.month) || ''} onChange={this.handleSelectChange.bind(this, 'month')} style={{width: '50%'}}>
                        {month_options.map(function (option) {
                             return <MenuItem value={option.value} key={option.value} primaryText={option.label} />;
                         })}
                    </SelectField>
                    <SelectField id="search_form_year" floatingLabelText="year" floatingLabelFixed={true} value={parseInt(this.props.year) || ''} onChange={this.handleSelectChange.bind(this, 'year')} style={{width: '50%'}}>
                        <MenuItem value="" primaryText="-" />
                        {this.props.years.map(function (y) {
                             return <MenuItem value={y} key={y} primaryText={y} />;
                         })}
                    </SelectField>
                </div>
                <div>
                    <SelectField id="search_form_order" floatingLabelText="order" value={this.props.order} onChange={this.handleSelectChange.bind(this, 'order')} style={{width: '50%', verticalAlign: 'bottom'}}>
                        {
                            (this.props.filter == 'hausdorff' ? order_options_hausdorff : order_options).map(option =>
                                <MenuItem value={option.value} key={option.value} primaryText={option.label} />
                            )
                        }
                    </SelectField>
                    <TextField id="search_form_limit" floatingLabelText="limit" floatingLabelFixed={true} value={this.props.limit} onChange={this.handleTextChange.bind(this, 'limit')} style={{width: '50%'}} />
                </div>
            </form>
        );
    }
}


function mapStateToProps(state) {
    return Object.assign({}, state.main.search_form, { 
        years: state.main.years, 
        open_sidebar: state.main.open_sidebar ,
        users: state.main.users,
    });
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({setSearchForm, resetSearchForm, search, toggleSidebar, setTabValue}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(SearchForm);
