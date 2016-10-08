import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import SearchFormContainer from './search-form';
import { connect } from 'react-redux';
import { getMoreItems, addPaths, setSelectedItem } from './actions';
import {Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn} from 'material-ui/Table';
import FlatButton from 'material-ui/FlatButton';
import Toggle from 'material-ui/Toggle';

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
    }
    handleGetMore() {
        this.props.getMoreItems(this.props.params);
    }
    handleSelect(selectedRows) {
        if (selectedRows.length == 0) return;
        let index = selectedRows[0];
        let item = this.props.rows[index];
        this.props.setSelectedItem(item, index);
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
        return (
            <div className="sidebar">
                <SearchFormContainer />
                <div>
                    <strong>
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

                    </strong> :
            { this.props.rows.length > 0 ? (<FlatButton onTouchTap={ this.handleShowAll.bind(this) } label="show all paths" />) : null }
            { this.props.rows.length > 0 && this.props.rows[0].distance !== undefined ?
              <Toggle
                  label="show hausdorff distance" toggled={this.state.show_distance} onToggle={this.handleShowDistance.bind(this)} /> : null }
                </div>
                <Table onRowSelection={this.handleSelect.bind(this)} style={{cursor: 'pointer'}}>
                    <TableBody stripedRows  displayRowCheckbox={false}>
                        { this.props.rows.map( (item, index) =>
                            <TableRow key={index}>
                                <TableRowColumn style={td_styles[0]}>{index+1}</TableRowColumn>
                                <TableRowColumn style={td_styles[1]}>{item.date}</TableRowColumn>
                                <TableRowColumn style={td_styles[2]}>{item.title}</TableRowColumn>
                                <TableRowColumn style={td_styles[3]}>{this.state.show_distance && item.distance !== undefined ? item.distance.toFixed(1) : item.length.toFixed(1)}</TableRowColumn>
                            </TableRow>)
                        }
                    </TableBody>
                </Table>
                { this.props.params ? <FlatButton style={{width: '100%'}} onTouchTap={this.handleGetMore.bind(this)} label="more" /> : null }
            </div>
        );
    }
}

function mapStateToProps(state) {
    return Object.assign({}, state.main.result);
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ getMoreItems, setSelectedItem, addPaths }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(SearchBox);
