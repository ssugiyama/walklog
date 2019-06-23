import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
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

const WalkEditor = () => {
    const [state, setState] = useState({
        id: '', date: null, title: '', comment: '', initialized: false, processing: false
    });
    const selectedPath = useSelector(state => state.main.selectedPath);
    const selectedItem = useSelector(state => state.main.selectedItem);
    const walkEditorOpened = useSelector(state => state.main.walkEditorOpened);
    const walkEditorMode = useSelector(state => state.main.walkEditorMode);
    const dispatch = useDispatch();

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
            const newState = Object.assign({}, item, {path, updatePath, date, initialized, processing});
            setState(newState);
        }
    }
    const keys = useRef([]);
   
    const handleClose = useCallback(() => {
        dispatch(openWalkEditor(false));
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
            dispatch(push({pathname: '/' + json[0].id, search: 'forceFetch=1' }));
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
                dispatch(setSelectedItem(null));
                dispatch(push({pathname: '/' + state.id, query: {forceFetch: 1} }));
                handleClose();
            }).catch(ex => alert(ex));
        }
    });
    const handleChange = (name, value)=> {
        keys.current.add(name);
        setState(state => Object.assign({}, state, {[name]: value}));
    };
    const dateChangeCB       = useCallback(e => handleChange('date', e.target.value));
    const titleChangeCB      = useCallback(e => handleChange('title', e.target.value));
    const commentChangeCB    = useCallback(e => handleChange('comment', e.target.value));
    const imageChangeCB      = useCallback(e => handleChange('date', e));
    const updatePathChangeCB = useCallback((e, checked) => handleChange('updatePath', checked));

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
                    <TextField type="date" value={state.date} onChange={dateChangeCB} container="inline" mode="landscape" label='date' fullWidth={true} />
                    <TextField defaultValue={state.title} onChange={titleChangeCB} label="title" fullWidth={true} />
                    <ImageUploader label="image" value={state.image} onChange={imageChangeCB} ></ImageUploader>
                    <TextField multiline rows={4} rowsMax={20}
                        defaultValue={state.comment} onChange={commentChangeCB} label="comment" fullWidth={true} />
                    {
                        walkEditorMode == 'update' &&
                        <FormControlLabel
                            control={<Switch onChange={updatePathChangeCB}  checked={state.updatePath} disabled={state.path == null} />}
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

export default WalkEditor;
