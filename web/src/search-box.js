import React, { useState, useContext, useCallback } from 'react';
import SearchForm from './search-form';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { push } from 'connected-react-router';
import { toggleView } from './actions';
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
import { makeStyles } from '@material-ui/styles';
import MapContext from './map-context';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ShowChartIcon from '@material-ui/icons/ShowChart';
import Divider from '@material-ui/core/Divider';
import Box from '@material-ui/core/Box';
import config from 'react-global-configuration';

const styles = theme => ({
    root: {
        padding: theme.spacing(1),
    },
    divider: {
        margin: theme.spacing(2),
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
        padding: theme.spacing(1),
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
        margin: theme.spacing(1),
    },
    leftIcon: {
        marginRight: theme.spacing(1),
    },
    inlineBlock: {
        display: 'inline-block',
    },
});

const useStyles = makeStyles(styles);

const SearchBox = props => {
    const lastQuery = useSelector(state => state.main.lastQuery);
    const users = useSelector(state => state.main.users);
    const offset = useSelector(state => state.main.result.offset);
    const count = useSelector(state => state.main.result.count);
    const error = useSelector(state => state.main.result.error);
    const rows = useSelector(state => state.main.result.rows);
    const searching = useSelector(state => state.main.result.searching);
    const dispatch = useDispatch();

    const [showDistance, setShowDistance] = useState(true);
    const context = useContext(MapContext);
    const classes = useStyles(props);
    const handleShowAll = useCallback(() => {
        context.state.addPaths(rows.map(row => row.path));
        dispatch(toggleView());
    });

    const handleSelect = (index) => {
        const item = rows[index];
        dispatch(push( config.get('itemPrefix') + item.id ));
    };
    const handleShowDistance = useCallback(e => {
        setShowDistance(e.target.value);
    });
    const moreUrl = `/?offset=${offset}` + (lastQuery && `&${lastQuery}`);
    const userObjs = {};
    for (const u of users) {
        userObjs[u.uid] = u;
    }
    return (
        <Paper className={classes.root}>
            <SearchForm />
            <Divider className={classes.divider} />
            <Box display="flex" m={1}>
                <Typography variant="body1" color={error ? 'error' : 'initial'} className={classes.inlineBlock}>
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
                                    return <span>{rows.length}  / {count} walks</span>;
                                }
                            }
                        })()
                    }
                </Typography> :
                <Box flexGrow={1} />
                { rows.length > 0 &&
                    (<Button variant="outlined" onClick={ handleShowAll } color="secondary"><ShowChartIcon className={classes.leftIcon} />draw</Button>) }
            </Box>
            <Table className={classes.table}>
                <TableHead>
                    <TableRow>
                        <TableCell classes={{ root: classes.cell}}><Typography variant="body2">user</Typography></TableCell>
                        <TableCell classes={{ root: classes.cell}}><Typography variant="body2">date</Typography></TableCell>
                        <TableCell classes={{ root: classes.cell}}><Typography variant="body2">title</Typography></TableCell>
                        <TableCell classes={{ root: classes.cell}}>{
                            rows.length > 0 && rows[0].distance !== undefined ?
                                (<Select value={showDistance} onChange={handleShowDistance}>
                                    <MenuItem value={true}><Typography variant="body2">distance</Typography></MenuItem>
                                    <MenuItem value={false}><Typography variant="body2">length</Typography></MenuItem>
                                </Select>) : (<Typography variant="body2">length</Typography>)
                        }</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    { rows.map( (item, index) => {
                        const u = userObjs[item.uid];
                        return (
                            <TableRow className={classes.row} key={index} onClick={() => handleSelect(index)}>
                                <TableCell classes={{ root: classes.cell}}>
                                    { u && <img className={classes.userPhoto} src={u.photoURL} alt={u.displayName} title={u.displayName} />}
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

export default SearchBox;
