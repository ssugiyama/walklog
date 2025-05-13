import React, {
    useActionState, useEffect, useRef, useCallback, 
} from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import ImageUploader from './image-uploader';
// import { idToUrl } from '../utils/meta-utils';
import { useData } from '../utils/data-context';
import { updateItemAction } from '@/app/lib/walk-actions';
import Form from 'next/form'
import { useQueryParam, StringParam, withDefault } from 'use-query-params';
import { useRouter } from 'next/navigation';
import { useUserContext } from '../utils/user-context';
import { useMapContext } from '../utils/map-context';

const WalkEditor = ({item, opened, setOpened}) => {
    console.log('WalkEditor', item, opened)
    const router = useRouter()
    const formRef = useRef(null);
    const initialState = {
        id: null,
        error: null,
        idTokenExpired: false,
        serial: 0,
    }
    const [state, formAction, isPending] = useActionState(updateItemAction, initialState)
    const { updateIdToken } = useUserContext()
    const { reset, data } = useData()
    const [searchPath] = useQueryParam('path', withDefault(StringParam, ''));
    const context = useMapContext();
    const { deleteSelectedPath } = context.state;
    const handleSubmit = useCallback(() => {
        formRef.current?.requestSubmit();
    }, [])
    const handleClose = useCallback(() => {
        setOpened(false)
    }, []);
    useEffect(() => {
        if (opened) {
            formRef.current?.reset()
        }
    }, [opened, formRef.current === null]);
    useEffect(() => {
        if (state.serial > 0) {
            if (state.idTokenExpired) {
                (async () => {
                    await updateIdToken()
                    handleSubmit()
                })()
            } else if (state.id && !state.error) {
                if (searchPath) deleteSelectedPath();
                handleClose()
                if (item?.id) {
                    reset()
                } else if (state.id) {
                    router.push(`/walk/${state.id}`)
                } 
            }
        }
    }, [state.serial]);
    return (
        <Dialog
            fullScreen
            open={opened}
            onClose={handleClose}
        >
            <DialogTitle>{ item?.id ? 'Update Walk' : 'New Walk' }</DialogTitle>
            <DialogContent>
            <Typography variant="body1" color="error" >{state.error}</Typography>
            <Form action={formAction} ref={formRef}>
                <input type="hidden" name="path" defaultValue={searchPath} />
                <input type="hidden" name="id" defaultValue={item?.id} />
                <FormGroup row>
                    <TextField type="date" name="date" defaultValue={item?.date} container="inline" variant="standard" mode="landscape" label="date" fullWidth />
                    <TextField defaultValue={item?.title} name="title" label="title" variant="standard" fullWidth />
                    <ImageUploader label="image" name="image" nameForDeletion="will_delete_image" defaultValue={item?.image} />
                    <TextField
                        multiline
                        minRows={4}
                        maxRows={20}
                        variant="standard"
                        defaultValue={item?.comment}
                        label="comment"
                        name="comment"
                        fullWidth
                    />
                    <FormControlLabel
                        control={<Switch defaultChecked={item?.draft || false} value="true" name="draft" />}
                        label="draft?"
                    />
                </FormGroup>
                </Form>
            </DialogContent>
            <DialogActions sx={{ pb: 'env(safe-area-inset-bottom)' }}>
                <Button onClick={handleClose} color="primary">cancel</Button>
                <Button disabled={isPending} onClick={handleSubmit} color="secondary">{ item?.id ? 'update' : 'create' }</Button>
            </DialogActions>
        </Dialog>
      
    );
};

export default WalkEditor;
