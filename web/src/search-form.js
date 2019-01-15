import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import 'whatwg-fetch';
import { connect } from 'react-redux';
import { setSearchForm, search } from './actions';
import Button from '@material-ui/core/Button';
import MenuItem from '@material-ui/core/MenuItem';
import TextField from '@material-ui/core/TextField';
import { withStyles } from '@material-ui/core/styles';
import { Link } from 'react-router-dom';

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
    { label: 'southernmost first', value: 'southernmost_first' },
    { label: 'easternmost first', value: 'easternmost_first' },
    { label: 'westernmost first', value: 'westernmost_first' },
];

const order_options_with_nearest = [
    { label: 'nearest first', value: 'nearest_first' },
];

const styles = {
};

class SearchForm extends Component {
    constructor(props) {
        super(props);
    }
    handleChange(name) {
        return event => this.props.setSearchForm({[name]: event.target.value});
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
                    <TextField select label="filter" value={this.props.filter} onChange={this.handleChange('filter')} style={{width: '50%'}}>
                        <MenuItem value="">-</MenuItem>
                        <MenuItem value="neighborhood">Neighborhood</MenuItem>
                        <MenuItem value="cities">Cities</MenuItem>
                        <MenuItem value="frechet">Fréchet</MenuItem>
                        <MenuItem value="hausdorff">Hausdorff</MenuItem>
                        <MenuItem value="crossing">Crossing</MenuItem>
                    </TextField>
                    <TextField select label="user" value={this.props.user} onChange={this.handleChange('user')} 
                        style={{width: '50%'}}
                    >
                        <MenuItem value="">-</MenuItem>
                        {this.props.users.map(u => <MenuItem value={u.id} key={u.id}>{u.username}</MenuItem>)}
                    </TextField>
                </div>
                <div>
                    <TextField select label="month" value={parseInt(this.props.month) || ''} onChange={this.handleChange('month')} 
                        style={{width: '50%'}}
                    >
                        {month_options.map(option => <MenuItem value={option.value} key={option.value}>{option.label}</MenuItem>)}
                    </TextField>
                    <TextField select label="year" value={parseInt(this.props.year) || ''} onChange={this.handleChange('year')} 
                        style={{width: '50%'}} 
                    >
                        <MenuItem value="">-</MenuItem>
                        {this.props.years.map(y => <MenuItem value={y} key={y}>{y}</MenuItem>)}
                    </TextField>
                </div>
                <div>
                    <TextField select label="order" value={this.props.order} onChange={this.handleChange('order')} 
                        style={{width: '50%', verticalAlign: 'bottom'}} 
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
                    <Button style={{width: '100%'}} color="secondary" component={Link} to="/?force_fetch=1" >Reset</Button>
                </div>
            </form>
        );
    }
}

function mapStateToProps(state) {
    const { years, view, users } = state.main;
    return Object.assign({}, state.main.search_form, { 
        years, view, users,
    });
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({setSearchForm, search }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(SearchForm));
