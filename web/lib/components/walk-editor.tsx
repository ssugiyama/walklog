'use client'
import React, {
  useActionState, useEffect, useRef, useCallback, useState,
} from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import ImageUploader from './image-uploader';
import { useData } from '../utils/data-context';
import { updateItemAction } from '@/app/lib/walk-actions';
import Form from 'next/form'
import { useQueryParam, StringParam, withDefault } from 'use-query-params';
import { unauthorized, forbidden, useRouter, useSearchParams } from 'next/navigation';
import { useUserContext } from '../utils/user-context';
import { useMapContext } from '../utils/map-context';
import { idToShowUrl } from '../utils/meta-utils'
import { WalkT } from '@/types'
import { useConfig } from '../utils/config'
import moment from 'moment'
import { Link } from '@mui/material'
const WalkEditor = ({ mode }: { mode: 'update' | 'create' }) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const formRef = useRef(null);
  
  // フォームの状態を管理するstate
  const [formData, setFormData] = useState({
    date: '',
    title: '',
    comment: '',
    image: '',
    draft: false,
  });
  
  const initialState = {
    id: null,
    error: null,
    idTokenExpired: false,
    serial: 0,
  }
  const config = useConfig()
  const { updateIdToken, currentUser, users } = useUserContext()
  const [data, setData] = useData()
  let item: WalkT
  if (mode === 'update') {
    item = data.current
  } else {
    const today = moment().format('YYYY-MM-DD')
    item = {
      id: null,
      uid: null,
      date: today,
      title: '',
      comment: '',
      image: '',
      draft: true,      
    }
  }

  // 初期値の設定
  useEffect(() => {
    if (item) {
      setFormData({
        date: item.date,
        title: item.title,
        comment: item.comment,
        image: item.image,
        draft: item.draft,
      })
    }
  }, [item.id]);

  const [state, formAction, isPending] = useActionState(updateItemAction, initialState)
  const [searchPath] = useQueryParam('path', withDefault(StringParam, null));
  const [mapState] = useMapContext();
  const { deleteSelectedPath } = mapState;
  
  // フォーム入力の変更ハンドラー
  const handleInputChange = useCallback((field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'draft' ? event.target.checked : event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    formRef.current?.requestSubmit();
  }, [])
  
  useEffect(() => {
    if (state.serial > 0) {
      if (state.idTokenExpired) {
        (async () => {
          await updateIdToken()
          handleSubmit()
        })()
      } else if (state.id) {
        if (searchPath) deleteSelectedPath()
        if (mode === 'update') {
          setData({ rows: [] })
        }
        router.push(idToShowUrl(state.id))
      }
    }
  }, [state.serial])
  
  if (currentUser === null) {
    unauthorized()
  }
  if (currentUser === undefined) {
    return null
  }
  const dataUser = users.find((u) => u.uid === currentUser.uid) ?? null
  if (!config.openUserMode && !dataUser?.admin) {
    forbidden()
  }
  return (
    <Box data-testid="WalkEditor">
      <Paper sx={{ width: '100%', textAlign: 'center', padding: 2 }}>
        <Typography variant="body1" color="error" >{state.error?.message}</Typography>
        <Form action={formAction} name="walk-form" ref={formRef}>
          <input type="hidden" name="path" defaultValue={searchPath ?? item?.path} />
          <input type="hidden" name="id" defaultValue={item?.id} />
          <FormGroup row>
            <TextField 
              type="date" 
              name="date" 
              value={formData.date}
              onChange={handleInputChange('date')}
              variant="standard" 
              label="date" 
              fullWidth 
            />
            <TextField 
              value={formData.title}
              onChange={handleInputChange('title')}
              name="title" 
              label="title" 
              variant="standard" 
              fullWidth 
            />
            <ImageUploader 
              label="image" 
              name="image" 
              nameForDeletion="will_delete_image" 
              value={item?.image}
              forceValue={state.serial}
            />
            <TextField
              multiline
              minRows={4}
              maxRows={20}
              variant="standard"
              value={formData.comment}
              onChange={handleInputChange('comment')}
              label="comment"
              name="comment"
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={formData.draft} 
                  onChange={handleInputChange('draft')}
                  value="true" 
                  name="draft" 
                />
              }
              label="draft?"
            />
          </FormGroup>
        </Form>
        <Box sx={{ marginTop: 1, textAlign: 'right' }}>
          <Button component={Link} href={mode === 'update' ? idToShowUrl(item.id, searchParams) : `/?${searchParams.toString()}`} color="primary">cancel</Button>
          <Button data-testid="submit-button" disabled={isPending} onClick={handleSubmit} color="secondary">{mode}</Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default WalkEditor
