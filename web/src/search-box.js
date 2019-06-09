import React, { memo, useState, useContext } from 'react';
import { bindActionCreators } from 'redux';
import SearchFormContainer from './search-form';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { push } from 'connected-react-router';
import { getMoreItems, setSelectedItem, toggleView } from './actions';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableHead from '@material-ui/core/TableHead';
import TableBody from '@material-ui/core/TableBody';
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import Button from '@material-ui/core/Button';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import MapContext from './map-context';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ShowChartIcon from '@material-ui/icons/ShowChart';

const styles = theme => ({
    root: {
        padding: 16,
    },
    table: {
        cursor: 'pointer',
    },
    row: {
        '&:nth-of-type(odd)': {
            backgroundColor: theme.palette.background.default,
        },
    },
    cell: {
        padding: '4px 2px 4px 2px',
        '&:nth-of-type(1)': {
            width: 40,
            whiteSpace: 'nowrap',
        },
        '&:nth-of-type(2)': {
            width: 80,
            whiteSpace: 'nowrap',
        },
        '&:nth-of-type(4)': {
            width: 40,
            textAlign: 'right',
        },
    },
    userPhoto: {
        width: 20,
        height:20,
    },
    moreButton: {
        width: 'calc(100% - 20px)',
        margin: 10,
    },
    leftIcon: {
        marginRight: theme.spacing(1),
    }
});

const SearchBox = props => {
    const [showDistance, setShowDistance] = useState(true); 
    const context = useContext(MapContext);
    const { toggleView, push } = props;
    const { lastQuery, offset, count, error, rows, users, searching  } = props;
    const handleShowAll = () => {
        context.state.addPaths(rows.map(row => row.path));
        toggleView();
    };

    const handleSelect = (index) => {
        const item = rows[index];
        push( '/' + item.id );
    };
    const handleShowDistance = (value) => {
        setShowDistance(value);
    };
    const { classes } = props;
    const moreUrl = `/?offset=${offset}` + (lastQuery && `&${lastQuery}`);
    const userObjs = {};
    for (const u of users) {
        userObjs[u.id] = u;
    }
    return (
        <Paper className={classes.root}>
            <SearchFormContainer />
            <div>
                <Typography variant="body1" color={error ? 'error' : 'default'} style={{ display: 'inline-block' }}>
                    {
                        ( () => {
                            if (error) {
                                return <span>error: {error.message}</span>;
                            }
                            else if (searching) {
                                return <span>Searching now...</span>;
                            }
                            else {
                                switch (count) {
                                case null:
                                    return <span>successfully saved</span>;
                                case 0:
                                    return <span>No results</span>;
                                case 1:
                                    return <span>1 / 1 item</span>;
                                default:
                                    return <span>{rows.length}  / {count}  items</span>;
                                }
                            }
                        })()
                    }
                </Typography> :
                { rows.length > 0 && 
                    (<Button variant="outlined" onClick={ handleShowAll } color="secondary"><ShowChartIcon className={classes.leftIcon} />draw</Button>) }
            </div>
            <Table className={classes.table}>
                <TableHead>
                    <TableRow>
                        <TableCell classes={{ root: classes.cell}}><Typography variant="body2">user</Typography></TableCell>
                        <TableCell classes={{ root: classes.cell}}><Typography variant="body2">date</Typography></TableCell>
                        <TableCell classes={{ root: classes.cell}}><Typography variant="body2">title</Typography></TableCell>
                        <TableCell classes={{ root: classes.cell}}>{
                            rows.length > 0 && rows[0].distance !== undefined ?
                                (<Select value={showDistance} onChange={e => handleShowDistance(e.target.value)}>
                                    <MenuItem value={true}><Typography variant="body2">distance</Typography></MenuItem>
                                    <MenuItem value={false}><Typography variant="body2">length</Typography></MenuItem>
                                </Select>) : (<Typography variant="body2">length</Typography>)
                        }</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    { rows.map( (item, index) => {
                        const u = userObjs[item.userId];
                        return (
                            <TableRow className={classes.row} key={index} onClick={() => handleSelect(index)}>
                                <TableCell classes={{ root: classes.cell}}>
                                    { u && <img className={classes.userPhoto} src={u.photo} alt={u.username} title={u.username} />}
                                </TableCell>
                                <TableCell classes={{ root: classes.cell}}>{item.date}</TableCell>
                                <TableCell classes={{ root: classes.cell}}>{item.title}</TableCell>
                                <TableCell classes={{ root: classes.cell}}>{showDistance && item.distance !== undefined ? item.distance.toFixed(1) : item.length.toFixed(1)}</TableCell>
                            </TableRow>);
                    })}
                </TableBody>
            </Table>
            { offset > 0 && 
                <Button variant="outlined" className={classes.moreButton} color="primary" component={Link} to={moreUrl}>
                    <ExpandMoreIcon className={classes.leftIcon}/> more
                </Button>  }
        </Paper>
    );
};

function mapStateToProps(state) {
    return Object.assign({}, state.main.result, 
        {lastQuery: state.main.lastQuery}, 
        {users: state.main.users} );
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ getMoreItems, setSelectedItem, toggleView, push }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(memo(SearchBox)));
