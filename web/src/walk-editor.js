import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import { setSelectedItem, openWalkEditor } from './actions';
import Button from 'material-ui/Button';
import Dialog, {
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from 'material-ui/Dialog';
import { FormGroup, FormControlLabel } from 'material-ui/Form';
import TextField from 'material-ui/TextField';
import Switch from 'material-ui/Switch';
import IconButton from 'material-ui/IconButton';
import NavigationClose from '@material-ui/icons/Close';
import moment from 'moment';

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
            this.props.push({pathname: '/' + json[0].id, query: {force_fetch: 1} });
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
                this.props.push({pathname: '/' + this.state.id, query: {force_fetch: 1} });
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
                date = item.date;
            }
            else {
                item = {id: '', date: '', title: '', comment: ''};
                date = moment().format('YYYY-MM-DD');
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
        return (
            <Dialog
                fullScreen
                open={this.props.open_walk_editor}
                onClose={this.handleClose.bind(this)}
            >
                <DialogTitle>{ this.props.walk_editor_mode == 'update' ? 'Update Walk' : 'New Walk' }</DialogTitle>
                <DialogContent>
                    <FormGroup row>
                        <TextField type="date" value={this.state.date} onChange={this.handleChange.bind(this, 'date')} container="inline" mode="landscape" label='date' fullWidth={true} autoOk={true} />
                        <TextField defaultValue={this.state.title} onBlur={this.handleChange.bind(this, 'title')} label="title" fullWidth={true} />
                        <TextField multiline rows={4} rowsMax={20}
                                defaultValue={this.state.comment} onBlur={this.handleChange.bind(this, 'comment')} label="comment" fullWidth={true} />
                        {
                            this.props.walk_editor_mode == 'update' &&
                            <FormControlLabel
                                control={<Switch onChange={this.handleChange.bind(this, 'update_path')}  checked={this.state.update_path} disabled={this.state.path == null} />}
                                label="update path?" />
                        }
                    </FormGroup>
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.handleClose.bind(this)}>cancel</Button>
                    <Button onClick={this.handleSubmit.bind(this)} color="primary">{ this.props.walk_editor_mode || 'create' }</Button>
                    {this.props.walk_editor_mode == 'update' && 
                        <Button onClick={this.handleDelete.bind(this)} color="secondary">delete</Button>}
                </DialogActions>
                
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
