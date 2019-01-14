import React, { Component } from 'react';
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
        paddingLeft: 2,
        paddingRight: 2,
        '&:nth-of-type(1)': {
            width: 80,
            whiteSpace: 'nowrap',
        },
        '&:nth-of-type(3)': {
            width: 40,
            textAlign: 'right',
        },
    }
});

class SearchBox extends Component {
    constructor(props) {
        super(props);
        this.state = {show_distance: true};
    }
    handleShowAll() {
        this.context.addPaths(this.props.rows.map(row => row.path));
        this.props.toggleView();
    }
    handleGetMore() {
        this.props.getMoreItems(this.props.params);
    }
    handleSelect(index) {
        const item = this.props.rows[index];
        this.props.push( '/' + item.id );
    }
    shouldComponentUpdate(nextProps, nextState) {
        if (nextProps.rows != this.props.rows) return true;
        if (nextState.show_distance != this.state.show_distance) return true;
        return false;
    }
    handleShowDistance(event) {
        this.setState({show_distance: event.target.value});
    }
    render() {
        const { classes } = this.props;
        const moreUrl = `/?offset=${this.props.offset}` + (this.props.last_query && `&${this.props.last_query}`);
        return (
            <Paper className={classes.root}>
                <SearchFormContainer />
                <div>
                    <Typography variant="body1" color={this.props.error ? 'error' : 'default'} style={{ display: 'inline-block' }}>
                        {
                            ( () => {
                                if (this.props.error) {
                                    return <span>error: {this.props.error.message}</span>;
                                }
                                else if (this.props.searching) {
                                    return <span>Searching now...</span>;
                                }
                                else {
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
                                }
                            })()
                        }
                    </Typography> :
            { this.props.rows.length > 0 && (<Button onClick={ this.handleShowAll.bind(this) } color="secondary">show all paths</Button>) }
                </div>
                <Table className={classes.table}>
                    <TableHead>
                        <TableRow>
                            <TableCell><Typography variant="body2">date</Typography></TableCell>
                            <TableCell><Typography variant="body2">title</Typography></TableCell>
                            <TableCell>{
                                this.props.rows.length > 0 && this.props.rows[0].distance !== undefined ?
                                (<Select value={this.state.show_distance} onChange={this.handleShowDistance.bind(this)}>
                                <MenuItem value={true}><Typography variant="body2">distance</Typography></MenuItem>
                                <MenuItem value={false}><Typography variant="body2">length</Typography></MenuItem>
                                </Select>) : (<Typography variant="body2">length</Typography>)
                            }</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        { this.props.rows.map( (item, index) =>
                            <TableRow className={classes.row} key={index} onClick={this.handleSelect.bind(this, index)}>
                                <TableCell className={classes.cell}>{item.date}</TableCell>
                                <TableCell className={classes.cell}>{item.title}</TableCell>
                                <TableCell className={classes.cell}>{this.state.show_distance && item.distance !== undefined ? item.distance.toFixed(1) : item.length.toFixed(1)}</TableCell>
                            </TableRow>)
                        }
                    </TableBody>
                </Table>
                { this.props.offset > 0 && <Button style={{width: '100%'}} color="secondary" component={Link} to={moreUrl}>more</Button>  }
            </Paper>
        );
    }
}

SearchBox.contextType = MapContext;

function mapStateToProps(state) {
    return Object.assign({}, state.main.result, {last_query: state.main.last_query} );
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ getMoreItems, setSelectedItem, toggleView, push }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(SearchBox));
