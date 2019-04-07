import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { push } from 'connected-react-router';
import { setSelectedItem, openWalkEditor } from './actions';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import TextField from '@material-ui/core/TextField';
import Switch from '@material-ui/core/Switch';
import moment from 'moment';
import ImageUploader from './image-uploader';

class WalkEditor extends Component {
    constructor(props) {
        super(props);
        this.state = {id: '', date: null, title: '', comment: '', initialized: false};
        this.keys = new Set();
    }
    handleClose() {
        this.props.openWalkEditor(false);
        this.setState({initialized: false});
    }
    handleSubmit() {
        if (! this.state.id || this.state.update_path) {
            this.keys.add('path');
        }
        if (this.state.id) {
            this.keys.add('id');
        }
        else {
            this.keys.add('date');
        }
        // const params = keys.map(key => `${key}=${encodeURIComponent(this.state[key])}`).join('&');
        const formData = new FormData();
        for (const key of this.keys) {
            formData.append(key, this.state[key]);
        }
        fetch('/api/save', {
            method: 'POST',
            credentials: 'include',
            body: formData
        }).then(response => {
            if (!response.ok) {
                throw Error(response.statusText);
            }
            return response;
        }).then(
            response => response.json()
        ).then(json => {
            this.props.push({pathname: '/' + json[0].id, search: 'force_fetch=1' });
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
                this.props.push({pathname: '/' + this.state.id, query: {force_fetch: 1} });
                this.handleClose();
            }).catch(ex => alert(ex));
        }
    }
    handleChange(name, e) {
        this.keys.add(name);
        this.setState({[name]: e.target.value});
    }
    handleSelectFile(name, value) {
        this.keys.add(name);
        this.setState({[name]: value});
    }
    handleSwitch(name, e, checked) {
        this.setState({[name]: checked});
    }
    static getDerivedStateFromProps(nextProps, prevState) {
        if (nextProps.open_walk_editor && ! prevState.initialized) {

            const path = nextProps.selected_path;
            let item, update_path, date;
            const initialized = true;
            if (nextProps.walk_editor_mode == 'update') {
                item = nextProps.selected_item;
                date = item.date;
            }
            else {
                item = {id: '', date: '', title: '', image: '', comment: ''};
                date = moment().format('YYYY-MM-DD');
            }
            if (path == null && nextProps.walk_editor_mode == 'create') {
                alert('draw or select a path on map');
                return null;
            }
            else if (path == null) {
                update_path = false;
            }
            const state = Object.assign({}, item, {path, update_path, date, initialized});
            return state;
        }
        else {
            return null;
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
                        <TextField type="date" value={this.state.date} onChange={this.handleChange.bind(this, 'date')} container="inline" mode="landscape" label='date' fullWidth={true} />
                        <TextField defaultValue={this.state.title} onChange={this.handleChange.bind(this, 'title')} label="title" fullWidth={true} />
                        <ImageUploader label="image" value={this.state.image} onChange={this.handleSelectFile.bind(this, 'image')} ></ImageUploader>
                        <TextField multiline rows={4} rowsMax={20}
                                defaultValue={this.state.comment} onChange={this.handleChange.bind(this, 'comment')} label="comment" fullWidth={true} />
                        {
                            this.props.walk_editor_mode == 'update' &&
                            <FormControlLabel
                                control={<Switch onChange={this.handleSwitch.bind(this, 'update_path')}  checked={this.state.update_path} disabled={this.state.path == null} />}
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
