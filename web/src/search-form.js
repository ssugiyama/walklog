import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import 'whatwg-fetch';
import { connect } from 'react-redux';
import { setSearchForm, resetSearchForm, search, toggleSidebar, setTabValue} from './actions';
import Button from 'material-ui/Button';
import SearchIcon from '@material-ui/icons/Search';
import Select from 'material-ui/Select';
import { MenuItem } from 'material-ui/Menu';
import TextField from 'material-ui/TextField';
import IconButton from 'material-ui/IconButton';
import { withStyles } from 'material-ui/styles';

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

const order_options_with_nearest = [
    { label: 'nearest first', value: 'nearest_first' },
];

const styles = {
    menuList: {
        display: 'flex',
        flexDirection: 'column',
        paddingLeft: 10,
        paddingRight: 10,
        alignItems: 'left',
    },
};

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
        case 'frechet':
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
    handleChange(name) {
        return event => this.props.setSearchForm({[name]: event.target.value});
    }
    reset() {
        this.props.resetSearchForm();
        this.setState({force_search: true});
    }
    render() {
        const classes = this.props.classes;
        return (
            <form role="form">
                <input type="hidden" name="latitude" value="" />
                <input type="hidden" name="longitude" value="" />
                <input type="hidden" name="radius" value="" />
                <input type="hidden" name="cities" value=""  />
                <input type="hidden" name="searchPath" value=""  />
                <div>
                    <TextField select label="filter" value={this.props.filter} onChange={this.handleChange('filter')} style={{width: '50%'}}
                        SelectProps={{
                            MenuProps: {
                                MenuListProps: {
                                    className: classes.menuList,
                                }
                            }
                        }}
                    >
                        <MenuItem value="any">Any</MenuItem>
                        <MenuItem value="neighborhood">Neighborhood</MenuItem>
                        <MenuItem value="cities">Cities</MenuItem>
                        <MenuItem value="frechet">Fréchet</MenuItem>
                        <MenuItem value="hausdorff">Hausdorff</MenuItem>
                        <MenuItem value="crossing">Crossing</MenuItem>
                    </TextField>
                    <TextField select label="user" value={this.props.user} onChange={this.handleChange('user')} 
                        style={{width: '50%'}}
                        SelectProps={{
                            MenuProps: {
                                MenuListProps: {
                                    className: classes.menuList,
                                }
                            }
                        }}    
                    >
                        <MenuItem value="">-</MenuItem>
                        {this.props.users.map(u => <MenuItem value={u.id} key={u.id}>{u.username}</MenuItem>)}
                    </TextField>
                </div>
                <div>
                    <TextField select label="month" value={parseInt(this.props.month) || ''} onChange={this.handleChange('month')} 
                        style={{width: '50%'}}
                        SelectProps={{
                            MenuProps: {
                                MenuListProps: {
                                    className: classes.menuList,
                                }
                            }
                        }}    
                    >
                        {month_options.map(option => <MenuItem value={option.value} key={option.value}>{option.label}</MenuItem>)}
                    </TextField>
                    <TextField select label="year" value={parseInt(this.props.year) || ''} onChange={this.handleChange('year')} 
                        style={{width: '50%'}}
                        SelectProps={{
                            MenuProps: {
                                MenuListProps: {
                                    className: classes.menuList,
                                }
                            }
                        }}    
                    >
                        <MenuItem value="">-</MenuItem>
                        {this.props.years.map(y => <MenuItem value={y} key={y}>{y}</MenuItem>)}
                    </TextField>
                </div>
                <div>
                    <TextField select label="order" value={this.props.order} onChange={this.handleChange('order')} 
                        style={{width: '50%', verticalAlign: 'bottom'}}
                        SelectProps={{
                            MenuProps: {
                                MenuListProps: {
                                    className: classes.menuList,
                                }
                            }
                        }}    
                    >
                        {
                            (this.props.filter == 'hausdorff' || this.props.filter == 'frechet' ? order_options_with_nearest : order_options).map(option =>
                                <MenuItem value={option.value} key={option.value}>{option.label}</MenuItem>
                            )
                        }
                    </TextField>
                    <TextField id="search_form_limit" label="limit" value={this.props.limit} onChange={this.handleChange('limit')} style={{width: '50%'}} />
                </div>
                <div>
                    <Button onClick={this.reset.bind(this)} style={{width: '100%'}}>Reset</Button>
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

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(SearchForm));
