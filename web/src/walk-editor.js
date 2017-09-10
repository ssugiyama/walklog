import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import { setSelectedItem, openWalkEditor } from './actions';
import FlatButton from 'material-ui/FlatButton';
import Dialog from 'material-ui/Dialog';
import DatePicker from 'material-ui/DatePicker';
import TextField from 'material-ui/TextField';
import Toggle from 'material-ui/Toggle';
import IconButton from 'material-ui/IconButton';
import NavigationClose from 'material-ui/svg-icons/navigation/close';
import styles from './styles';

class WalkEditor extends Component {
    constructor(props) {
        super(props);
        this.state = {id: '', date: null, title: '', comment: ''};
    }
    handleClose() {
        this.props.openWalkEditor(false);
    }
    handleSubmit() {
        function formatDate(d) {
            return d.getFullYear()+
            ( '0' + ( d.getMonth()+1 ) ).slice(-2)+
            ( '0' + d.getDate() ).slice(-2);
        }
        const keys = ['date', 'title', 'comment'];

        if (! this.state.id || this.state.update_path) {
            keys.push('path');
        }
        if (this.state.id) {
            keys.push('id');
        }
        const state = Object.assign({}, this.state, {date: formatDate(this.state.date)});
        const params = keys.map(key => `${key}=${encodeURIComponent(state[key])}`).join('&');
        fetch('/api/save', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params
        }).then(response => {
            if (!response.ok) {
                throw Error(response.statusText);
            }
            return response;
        }).then(
            response => response.json()
        ).then(json => {
            this.props.push( '/' + json[0].id );
            this.handleClose();
        })
        .catch(ex => alert(ex));
    }
    handleDelete(e) {
        e.preventDefault();
        if (confirm('Are you sure to delete?')) {
            fetch('/api/destroy/' + this.state.id, {
                credentials: 'include',
            }).then(response => {
                    if (!response.ok) {
                        throw Error(response.statusText);
                    }
                    return response;
            }).then(() => {
                    this.props.setSelectedItem(null);
                    const query = { id: this.state.id };
                    this.props.push( {query} );
                    this.handleClose();
            }).catch(ex => alert(ex));
        }
    }
    handleChange(name, e, value) {
        this.setState({[name]: value !== undefined ? value : e.target.value});
    }
    componentWillReceiveProps(nextProps) {
        if (nextProps.open_walk_editor && !this.props.open_walk_editor) {

            const path = nextProps.selected_path;
            let item, update_path, date;

            if (nextProps.walk_editor_mode == 'update') {
                item = nextProps.selected_item;
                date = new Date(item.date);
            }
            else {
                item = {id: '', date: '', title: '', comment: ''};
                date = new Date();
            }
            if (path == null && nextProps.walk_editor_mode == 'create') {
                alert('draw or select a path on map');
                return;
            }
            else if (path == null) {
                update_path = false;
            }
            const state = Object.assign({}, item, {path, update_path, date});
            this.setState(state);
        }
    }
    render() {
        const actions = [];
        actions.push (<FlatButton onTouchTap={this.handleSubmit.bind(this)}  label={ this.props.walk_editor_mode || 'create' } primary={true} />);
        if (this.props.walk_editor_mode == 'update') {
            actions.push (<FlatButton label="delete" secondary={true} onTouchTap={this.handleDelete.bind(this)}/>);
        }
        // due to https://github.com/callemall/material-ui/issues/3394 we use onBlur.
        return (
            <Dialog
                    title={ this.props.walk_editor_mode == 'update' ? 'Update Walk' : 'New Walk' }
                    actions={actions}
                    modal={false}
                    open={this.props.open_walk_editor}
                    onRequestClose={this.handleClose.bind(this)}
                >
                    <div>
                        <DatePicker value={this.state.date} onChange={this.handleChange.bind(this, 'date')} container="inline" mode="landscape" floatingLabelText='date' floatingLabelFixed={true} fullWidth={true} autoOk={true} />
                    </div>
                    <div>
                        <TextField defaultValue={this.state.title} onBlur={this.handleChange.bind(this, 'title')} floatingLabelText="title" floatingLabelFixed={true}  fullWidth={true} />
                    </div>
                    <div>
                        <TextField multiLine={true} rows={4} rowsMax={4}
                                defaultValue={this.state.comment} onBlur={this.handleChange.bind(this, 'comment')} floatingLabelText="comment" floatingLabelFixed={true} fullWidth={true} />
                    </div>
                    {
                        this.props.walk_editor_mode == 'update' ?
                        <div><Toggle label="update path?" onToggle={this.handleChange.bind(this, 'update_path')}  toggled={this.state.update_path} disabled={this.state.path == null} /></div> : null
                    }
                        <IconButton style={styles.dialogCloseButton} onTouchTap={this.handleClose.bind(this)}><NavigationClose /></IconButton>
                </Dialog>
        );
    }
}

function mapStateToProps(state) {
    return {
        selected_path: state.main.selected_path,
        selected_item: state.main.selected_item,
        open_walk_editor: state.main.open_walk_editor,
        walk_editor_mode: state.main.walk_editor_mode,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ push, setSelectedItem, openWalkEditor }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(WalkEditor);
