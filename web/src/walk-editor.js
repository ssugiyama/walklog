import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
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

const WalkEditor = props => {
    const [state, setState] = useState({
        id: '', date: null, title: '', comment: '', initialized: false, processing: false
    });
    const { push, setSelectedItem, openWalkEditor } = props;
    const { selectedPath, selectedItem, walkEditorOpened, walkEditorMode } = props;

    if (walkEditorOpened && ! state.initialized) {
        const path = selectedPath;
        let item, updatePath, date;
        const initialized = true;
        const processing = false;
        if (walkEditorMode == 'update') {
            item = selectedItem;
            date = item.date;
        }
        else {
            item = {id: '', date: '', title: '', image: '', comment: ''};
            date = moment().format('YYYY-MM-DD');
        }
        if (path == null && walkEditorMode == 'create') {
            alert('draw or select a path on map');
        }
        else {
            if (path == null) {
                updatePath = false;
            }
            const new_state = Object.assign({}, item, {path, updatePath, date, initialized, processing});
            setState(new_state);
        }
    }
    const keys = useRef([]);
   
    const handleClose = useCallback(() => {
        openWalkEditor(false);
        setState(state => Object.assign({}, state, {initialized: false}));
    });
    const handleSubmit = useCallback(() => {
        setState(state => Object.assign({}, state, {processing: true}));
        if (! state.id || state.updatePath) {
            keys.current.add('path');
        }
        if (state.id) {
            keys.current.add('id');
        }
        else {
            keys.current.add('date');
        }
        // const params = keys.map(key => `${key}=${encodeURIComponent(this.state[key])}`).join('&');
        const formData = new FormData();
        for (const key of keys.current) {
            formData.append(key, state[key]);
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
            push({pathname: '/' + json[0].id, search: 'force_fetch=1' });
            handleClose();
        })
        .catch(ex => alert(ex));
    }, [state]);
    const handleDelete = useCallback((e) => {
        setState(state => Object.assign({}, state, {processing: true}));
        e.preventDefault();
        if (confirm('Are you sure to delete?')) {
            fetch('/api/destroy/' + state.id, {
                credentials: 'include',
            }).then(response => {
                if (!response.ok) {
                    throw Error(response.statusText);
                }
                return response;
            }).then(() => {
                setSelectedItem(null);
                push({pathname: '/' + state.id, query: {force_fetch: 1} });
                handleClose();
            }).catch(ex => alert(ex));
        }
    });
    const handleChange = useCallback((name, value) => {
        keys.current.add(name);
        setState(state => Object.assign({}, state, {[name]: value}));
    });

    useEffect(() => {
        if (walkEditorOpened) {
            keys.current = new Set();
        }
    }, [walkEditorOpened]);

    return (
        <Dialog
            fullScreen
            open={walkEditorOpened}
            onClose={handleClose}
        >
            <DialogTitle>{ walkEditorMode == 'update' ? 'Update Walk' : 'New Walk' }</DialogTitle>
            <DialogContent>
                <FormGroup row>
                    <TextField type="date" value={state.date} onChange={e => handleChange('date', e.target.value)} container="inline" mode="landscape" label='date' fullWidth={true} />
                    <TextField defaultValue={state.title} onChange={e => handleChange('title', e.target.value)} label="title" fullWidth={true} />
                    <ImageUploader label="image" value={state.image} onChange={e => handleChange('image', e)} ></ImageUploader>
                    <TextField multiline rows={4} rowsMax={20}
                            defaultValue={state.comment} onChange={e => handleChange('comment', e.target.value)} label="comment" fullWidth={true} />
                    {
                        walkEditorMode == 'update' &&
                        <FormControlLabel
                            control={<Switch onChange={(e, checked) => handleChange('updatePath', checked)}  checked={state.updatePath} disabled={state.path == null} />}
                            label="update path?" />
                    }
                </FormGroup>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>cancel</Button>
                <Button disabled={state.processing} onClick={handleSubmit} color="primary">{ walkEditorMode || 'create' }</Button>
                {walkEditorMode == 'update' && 
                    <Button disabled={state.processing} onClick={handleDelete} color="secondary">delete</Button>}
            </DialogActions>
            
        </Dialog>
    );  
};

function mapStateToProps(state) {
    return {
        selectedPath: state.main.selectedPath,
        selectedItem: state.main.selectedItem,
        walkEditorOpened: state.main.walkEditorOpened,
        walkEditorMode: state.main.walkEditorMode,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ push, setSelectedItem, openWalkEditor }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(memo(WalkEditor));
