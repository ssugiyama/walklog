import React, { memo, useCallback } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { setSearchForm, search } from './actions';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import MenuItem from '@material-ui/core/MenuItem';
import TextField from '@material-ui/core/TextField';
import { withStyles } from '@material-ui/core/styles';
import { Link } from 'react-router-dom';
import RefreshIcon from '@material-ui/icons/Refresh';

const monthOptions = [
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

const orderOptions  = [
    { label: 'newest first', value: 'newest_first' },
    { label: 'oldest first', value: 'oldest_first' },
    { label: 'longest first', value: 'longest_first' },
    { label: 'shortest first', value: 'shortest_first' },
    { label: 'northernmost first', value: 'northernmost_first' },
    { label: 'southernmost first', value: 'southernmost_first' },
    { label: 'easternmost first', value: 'easternmost_first' },
    { label: 'westernmost first', value: 'westernmost_first' },
];

const orderOptionsWithNearest = [
    { label: 'nearest first', value: 'nearest_first' },
];

const styles = theme => ({
    resetButton: {
        margin: 10
    },
    leftIcon: {
        marginRight: theme.spacing(1),
    }
});

const SearchForm = props => {
    
    const { setSearchForm, } = props;
    const { years, users, filter, month, year, user, limit, order, classes } = props;
    const handleChange = useCallback((name, value) => {
        setSearchForm({[name]: value});
    });
    
    return (
        <form role="form" className={classes.root}>
            <input type="hidden" name="latitude" value="" />
            <input type="hidden" name="longitude" value="" />
            <input type="hidden" name="radius" value="" />
            <input type="hidden" name="cities" value=""  />
            <input type="hidden" name="searchPath" value=""  />
            <div>
                <TextField select label="filter" value={filter} onChange={e => handleChange('filter', e.target.value)} style={{width: '50%'}}>
                    <MenuItem value="">-</MenuItem>
                    <MenuItem value="neighborhood">Neighborhood</MenuItem>
                    <MenuItem value="cities">Cities</MenuItem>
                    <MenuItem value="frechet">Fréchet</MenuItem>
                    <MenuItem value="hausdorff">Hausdorff</MenuItem>
                    <MenuItem value="crossing">Crossing</MenuItem>
                </TextField>
                <TextField select label="user" value={user} onChange={e => handleChange('user', e.target.value)} 
                    style={{width: '50%'}}
                >
                    <MenuItem value="">-</MenuItem>
                    {users.map(u => <MenuItem value={u.id} key={u.id}>{u.username}</MenuItem>)}
                </TextField>
            </div>
            <div>
                <TextField select label="month" value={parseInt(month) || ''} onChange={e => handleChange('month', e.target.value)} 
                    style={{width: '50%'}}
                >
                    {monthOptions.map(option => <MenuItem value={option.value} key={option.value}>{option.label}</MenuItem>)}
                </TextField>
                <TextField select label="year" value={parseInt(year) || ''} onChange={e => handleChange('year', e.target.value)} 
                    style={{width: '50%'}} 
                >
                    <MenuItem value="">-</MenuItem>
                    {years.map(y => <MenuItem value={y} key={y}>{y}</MenuItem>)}
                </TextField>
            </div>
            <div>
                <TextField select label="order" value={order} onChange={e => handleChange('order', e.target.value)} 
                    style={{width: '50%', verticalAlign: 'bottom'}} 
                >
                    {
                        (filter == 'hausdorff' || filter == 'frechet' ? orderOptionsWithNearest : orderOptions).map(option =>
                            <MenuItem value={option.value} key={option.value}>{option.label}</MenuItem>
                        )
                    }
                </TextField>
                <TextField id="searchForm_limit" label="limit" value={limit} onChange={e => handleChange('limit', e.target.value)} style={{width: '50%'}} />
            </div>
            <div style={{ textAlign: 'center' }}>
                <Button variant="outlined" className={classes.resetButton} color="primary" component={Link} to="/?force_fetch=1" >
                    <RefreshIcon className={classes.leftIcon} /> reset
                </Button>
            </div>
        </form>
    );
};

function mapStateToProps(state) {
    const { years, users } = state.main;
    return Object.assign({}, state.main.searchForm, { 
        years, users,
    });
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({setSearchForm, search }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(memo(SearchForm)));
