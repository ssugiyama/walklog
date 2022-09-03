import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { push } from '@lagunovsky/redux-react-router';
import { setSelectedItem, openWalkEditor } from '../actions';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import moment from 'moment';
import ImageUploader from './image-uploader';
import firebase from 'firebase/app';
import config from 'react-global-configuration';
import MapContext from './utils/map-context';

const WalkEditor = () => {
    const [state, setState] = useState({
        id: '', date: null, title: '', comment: '', initialized: false, processing: false
    });
    const selectedPath = useSelector(state => state.main.selectedPath);
    const selectedItem = useSelector(state => state.main.selectedItem);
    const walkEditorOpened = useSelector(state => state.main.walkEditorOpened);
    const walkEditorMode = useSelector(state => state.main.walkEditorMode);
    const dispatch = useDispatch();
    const context = useContext(MapContext);
    const { deleteSelectedPath } = context.state;
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
    const handleSubmit = useCallback(async () => {
        setState(state => Object.assign({}, state, {processing: true}));
        let willDeletePath = false;
        if (! state.id || state.updatePath) {
            keys.current.add('path');
            willDeletePath = true;
        }
        if (state.id) {
            keys.current.add('id');
        }
        // const params = keys.map(key => `${key}=${encodeURIComponent(this.state[key])}`).join('&');
        const formData = new FormData();
        formData.append('date', state['date']); // put date field at the first
        for (const key of keys.current) {
            if (key != 'date') formData.append(key, state[key]);
        }
        try {
            const idToken  = await firebase.auth().currentUser.getIdToken(true);
            const response = await fetch('/api/save', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + idToken
                },
                body: formData
            });
            if (!response.ok) {
                throw Error(response.statusText);
            }
            if (willDeletePath) {
                deleteSelectedPath();
            }
            const json = await response.json();
            dispatch(push({pathname: config.get('itemPrefix') + json[0].id, search: 'forceFetch=1' }));
            handleClose();
        } catch (error) {
            alert(error);
        }
    }, [state]);
    const handleDelete = useCallback(async e => {
        setState(state => Object.assign({}, state, {processing: true}));
        e.preventDefault();
        if (confirm('Are you sure to delete?')) {
            try {
                const idToken  = await firebase.auth().currentUser.getIdToken(true);
                const response = await fetch('/api/destroy/' + state.id, {
                    headers: {
                        'Authorization': 'Bearer ' + idToken
                    },
                });
                if (!response.ok) {
                    throw Error(response.statusText);
                }
                dispatch(setSelectedItem(null));
                dispatch(push({pathname: config.get('itemPrefix') + state.id, query: {forceFetch: 1} }));
                handleClose();
            } catch (error) {
                alert(error);
            }
        }
    });
    const handleChange = (name, value)=> {
        keys.current.add(name);
        setState(state => Object.assign({}, state, {[name]: value}));
    };
    const dateChangeCB       = useCallback(e => handleChange('date', e.target.value));
    const titleChangeCB      = useCallback(e => handleChange('title', e.target.value));
    const commentChangeCB    = useCallback(e => handleChange('comment', e.target.value));
    const imageChangeCB      = useCallback(e => handleChange('image', e));
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
                    <TextField type="date" value={state.date} onChange={dateChangeCB} container="inline" variant="standard" mode="landscape" label='date' fullWidth={true} />
                    <TextField defaultValue={state.title} onChange={titleChangeCB} label="title" variant="standard" fullWidth={true} />
                    <ImageUploader label="image" value={state.image} onChange={imageChangeCB} ></ImageUploader>
                    <TextField multiline minRows={4} maxRows={20} variant="standard"
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
                <Button onClick={handleClose} color="primary">cancel</Button>
                <Button disabled={state.processing} onClick={handleSubmit} color="secondary">{ walkEditorMode || 'create' }</Button>
                {walkEditorMode == 'update' &&
                    <Button disabled={state.processing} onClick={handleDelete} color="error">delete</Button>}
            </DialogActions>
        </Dialog>
    );
};

export default WalkEditor;
