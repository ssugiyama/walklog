import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import SearchFormContainer from './search-form';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { push } from 'react-router-redux';
import { getMoreItems, addPaths, setSelectedItem, toggleSidebar } from './actions';
import Table, {TableBody, TableHead, TableRow, TableCell} from 'material-ui/Table';
import Button from 'material-ui/Button';
import Switch from 'material-ui/Switch';
import { FormControlLabel } from 'material-ui/Form';
import { Typography } from 'material-ui';

const td_common_style = {
    paddingLeft: 2,
    paddingRight: 2,
    overflow: 'hidden',
};

const td_styles = [
    Object.assign({}, td_common_style, { width: 32, textAlign: 'right' }),
    Object.assign({}, td_common_style, { width: 80 }),
    td_common_style,
    Object.assign({}, td_common_style, { width: 40, textAlign: 'right'})
];

class SearchBox extends Component {
    constructor(props) {
        super(props);
        this.state = {show_distance: false};
    }
    handleShowAll() {
        this.props.addPaths(this.props.rows.map(row => row.path));
        this.props.toggleSidebar();
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
    handleShowDistance(e, toggled) {
        this.setState({show_distance: toggled});
    }
    render() {
        const moreUrl = `/?offset=${this.props.offset}` + (this.props.last_query && `&${this.props.last_query}`);
        return (
            <div style={{ paddingBottom: 20 }}>
                <SearchFormContainer />
                <div>
                    <Typography variant="body2" style={{ display: 'inline-block' }}>
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
            { this.props.rows.length > 0 && (<Button onClick={ this.handleShowAll.bind(this) }>show all paths</Button>) }
            { this.props.rows.length > 0 && this.props.rows[0].distance !== undefined &&
                <FormControlLabel
                    control={<Switch
                        checked={this.state.show_distance} onChange={this.handleShowDistance.bind(this)} />}
                    label="show line distance"></FormControlLabel> 
            }
                </div>
                <Table style={{cursor: 'pointer'}}>
                    <TableBody>
                        { this.props.rows.map( (item, index) =>
                            <TableRow key={index} onClick={this.handleSelect.bind(this, index)}>
                                <TableCell style={td_styles[0]}>{index+1}</TableCell>
                                <TableCell style={td_styles[1]}>{item.date}</TableCell>
                                <TableCell style={td_styles[2]}>{item.title}</TableCell>
                                <TableCell style={td_styles[3]}>{this.state.show_distance && item.distance !== undefined ? item.distance.toFixed(1) : item.length.toFixed(1)}</TableCell>
                            </TableRow>)
                        }
                    </TableBody>
                </Table>
                { this.props.offset > 0 && <Button style={{width: '100%'}} component={Link} to={moreUrl}>more</Button>  }
            </div>
        );
    }
}

function mapStateToProps(state) {
    return Object.assign({}, state.main.result, {last_query: state.main.last_query} );
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ getMoreItems, setSelectedItem, addPaths, toggleSidebar, push }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(SearchBox);
