import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setSearchForm  } from './actions';
import Button from '@material-ui/core/Button';
import MenuItem from '@material-ui/core/MenuItem';
import TextField from '@material-ui/core/TextField';
import { makeStyles } from '@material-ui/styles';
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
    root: {
        margin: theme.spacing(1),
    },
    leftIcon: {
        marginRight: theme.spacing(1),
    },
    formInput: {
        width: '50%',
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
        verticalAlign: 'center',
    },
    resetRow: {
        marginTop: theme.spacing(1),
        textAlign: 'right',
    },
});

const useStyles = makeStyles(styles);

const SearchForm = props => {
    const filter = useSelector(state => state.main.searchForm.filter);
    const month = useSelector(state => state.main.searchForm.month);
    const year = useSelector(state => state.main.searchForm.year);
    const user = useSelector(state => state.main.searchForm.user);
    const limit = useSelector(state => state.main.searchForm.limit);
    const order = useSelector(state => state.main.searchForm.order);
    const years = useSelector(state => state.main.years);
    const users = useSelector(state => state.main.users);
    const dispatch = useDispatch();
    const classes = useStyles(props);

    const createChangeCB = name => e => dispatch(setSearchForm({[name]: e.target.value}));
    const changeCBs = {
        'filter': useCallback(createChangeCB('filter'), []),
        'user':   useCallback(createChangeCB('user'), []),
        'month':  useCallback(createChangeCB('month'), []),
        'year':   useCallback(createChangeCB('year'), []),
        'order':  useCallback(createChangeCB('order'), []),
        'limit':  useCallback(createChangeCB('limit'), []),
    };

    return (
        <form role="form" className={classes.root}>
            <input type="hidden" name="latitude" value="" />
            <input type="hidden" name="longitude" value="" />
            <input type="hidden" name="radius" value="" />
            <input type="hidden" name="cities" value=""  />
            <input type="hidden" name="searchPath" value=""  />
            <div>
                <TextField select label="filter" value={filter} onChange={changeCBs['filter']} className={classes.formInput}>
                    <MenuItem value="">-</MenuItem>
                    <MenuItem value="neighborhood">Neighborhood</MenuItem>
                    <MenuItem value="cities">Cities</MenuItem>
                    <MenuItem value="frechet">Fréchet</MenuItem>
                    <MenuItem value="hausdorff">Hausdorff</MenuItem>
                    <MenuItem value="crossing">Crossing</MenuItem>
                </TextField>
                <TextField select label="user" value={user} onChange={changeCBs['user']}
                    className={classes.formInput}
                >
                    <MenuItem value="">-</MenuItem>
                    {users.map(u => <MenuItem value={u.uid} key={u.uid}>{u.displayName}</MenuItem>)}
                </TextField>
            </div>
            <div>
                <TextField select label="month" value={parseInt(month) || ''} onChange={changeCBs['month']}
                    className={classes.formInput}
                >
                    {monthOptions.map(option => <MenuItem value={option.value} key={option.value}>{option.label}</MenuItem>)}
                </TextField>
                <TextField select label="year" value={parseInt(year) || ''} onChange={changeCBs['year']}
                    className={classes.formInput}
                >
                    <MenuItem value="">-</MenuItem>
                    {years.map(y => <MenuItem value={y} key={y}>{y}</MenuItem>)}
                </TextField>
            </div>
            <div>
                <TextField select label="order" value={order} onChange={changeCBs['order']}
                    className={classes.formInput}
                >
                    {
                        (filter == 'hausdorff' || filter == 'frechet' ? orderOptionsWithNearest : orderOptions).map(option =>
                            <MenuItem value={option.value} key={option.value}>{option.label}</MenuItem>
                        )
                    }
                </TextField>
                <TextField id="searchForm_limit" label="limit" value={limit} onChange={changeCBs['limit']} className={classes.formInput} />
            </div>
            <div className={classes.resetRow}>
                <Button variant="outlined" color="primary" component={Link} to="/?forceFetch=1" >
                    <RefreshIcon className={classes.leftIcon} /> reset
                </Button>
            </div>
        </form>
    );
};

export default SearchForm;
