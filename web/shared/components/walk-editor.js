import React, {
    useState, useEffect, useRef, useCallback, useContext,
} from 'react';
import moment from 'moment';
import { useSelector, useDispatch } from 'react-redux';
import { push } from '@lagunovsky/redux-react-router';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import ImageUploader from './image-uploader';
import MapContext from '../utils/map-context';
import fetchWithAuth from '../fetch-with-auth';
import { idToUrl } from '../utils/meta-utils';
import { openWalkEditor } from '../features/view';

const WalkEditor = () => {
    const [state, setState] = useState({
        id: '', date: null, title: '', draft: false, comment: '', initialized: false, processing: false,
    });
    const selectedPath = useSelector((st) => st.map.selectedPath);
    const selectedItem = useSelector((st) => st.api.selectedItem);
    const walkEditorOpened = useSelector((st) => st.view.walkEditorOpened);
    const walkEditorMode = useSelector((st) => st.view.walkEditorMode);
    const dispatch = useDispatch();
    const context = useContext(MapContext);
    const { deleteSelectedPath } = context.state;
    if (walkEditorOpened && !state.initialized) {
        const path = selectedPath;
        let item;
        let updatePath;
        let date;
        const initialized = true;
        const processing = false;

        if (walkEditorMode === 'update') {
            item = selectedItem;
            date = item.date;
        } else {
            item = {
                id: '', date: '', title: '', draft: false, image: '', comment: '',
            };
            date = moment().format('YYYY-MM-DD');
        }
        if (path === null && walkEditorMode === 'create') {
            window.alert('draw or select a path on map');
        } else {
            if (path === null) {
                updatePath = false;
            }
            const newState = {
                ...item, path, updatePath, date, initialized, processing,
            };
            setState(newState);
        }
    }
    const keys = useRef([]);

    const handleClose = useCallback(() => {
        dispatch(openWalkEditor({ open: false }));
        setState((st) => ({ ...st, initialized: false }));
    });
    const handleSubmit = useCallback(async () => {
        setState((st) => ({ ...st, processing: true }));
        let willDeletePath = false;
        if (!state.id || state.updatePath) {
            keys.current.add('path');
            willDeletePath = true;
        }
        if (state.id) {
            keys.current.add('id');
        }
        const formData = new FormData();
        formData.append('date', state.date); // put date field at the first
        keys.current.forEach((key) => {
            if (key !== 'date') formData.append(key, state[key]);
        });
        try {
            const response = await fetchWithAuth('/api/save', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                throw Error(response.statusText);
            }
            if (willDeletePath) {
                deleteSelectedPath();
            }
            const json = await response.json();
            dispatch(push(idToUrl(json[0].id, { draft: state.draft, reload: true })));
            handleClose();
        } catch (error) {
            window.alert(error);
        }
    }, [state]);
    const handleChange = (name, value) => {
        keys.current.add(name);
        setState((st) => ({ ...st, [name]: value }));
    };
    const dateChangeCB = useCallback((e) => handleChange('date', e.target.value), []);
    const titleChangeCB = useCallback((e) => handleChange('title', e.target.value), []);
    const commentChangeCB = useCallback((e) => handleChange('comment', e.target.value), []);
    const draftChangeCB = useCallback((e, checked) => handleChange('draft', checked), []);
    const imageChangeCB = useCallback((e) => handleChange('image', e), []);
    const updatePathChangeCB = useCallback((e, checked) => handleChange('updatePath', checked), []);

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
            <DialogTitle>{ walkEditorMode === 'update' ? 'Update Walk' : 'New Walk' }</DialogTitle>
            <DialogContent>
                <FormGroup row>
                    <TextField type="date" value={state.date} onChange={dateChangeCB} container="inline" variant="standard" mode="landscape" label="date" fullWidth />
                    <TextField defaultValue={state.title} onChange={titleChangeCB} label="title" variant="standard" fullWidth />
                    <ImageUploader label="image" value={state.image} onChange={imageChangeCB} />
                    <TextField
                        multiline
                        minRows={4}
                        maxRows={20}
                        variant="standard"
                        defaultValue={state.comment}
                        onChange={commentChangeCB}
                        label="comment"
                        fullWidth
                    />
                    <FormControlLabel
                        control={<Switch checked={state.draft} onChange={draftChangeCB} />}
                        label="draft?"
                    />
                    {
                        walkEditorMode === 'update' &&
                            (
                                <FormControlLabel
                                    control={(
                                        <Switch
                                            onChange={updatePathChangeCB}
                                            checked={state.updatePath}
                                            disabled={state.path === null}
                                        />
                                    )}
                                    label="update path?"
                                />
                            )
                    }
                </FormGroup>
            </DialogContent>
            <DialogActions sx={{ pb: 'env(safe-area-inset-bottom)' }}>
                <Button onClick={handleClose} color="primary">cancel</Button>
                <Button disabled={state.processing} onClick={handleSubmit} color="secondary">{ walkEditorMode || 'create' }</Button>
            </DialogActions>
        </Dialog>
    );
};

export default WalkEditor;
