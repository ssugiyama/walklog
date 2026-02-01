'use client'
import React, {
  useActionState, useEffect, useCallback, useState,
  startTransition,
} from 'react'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import TextField from '@mui/material/TextField'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import ImageUploader from './image-uploader'
import { useData } from '../utils/data-context'
import { updateItemAction } from '@/app/lib/walk-actions'
import { useQueryParam, StringParam, withDefault } from 'use-query-params'
import { unauthorized, forbidden, useRouter, useSearchParams } from 'next/navigation'
import { useUserContext } from '../utils/user-context'
import { idToShowUrl } from '../utils/meta-utils'
import { WalkT } from '@/types'
import { useConfig } from '../utils/config'
import moment from 'moment'
import { useMainContext } from '../utils/main-context'
import Link from 'next/link'

type WalkFields = {
  date: string;
  title: string;
  comment: string;
  image: File | string |null;
  will_delete_image: string;
  draft: boolean;
}
const WalkEditor = ({ mode }: { mode: 'update' | 'create' }) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [, dispatchMain, interceptLink] = useMainContext()
  // フォームの状態を管理するstate
  const [inputs, setInputs] = useState<WalkFields>({
    date: '',
    title: '',
    comment: '',
    image: null,
    will_delete_image: '',
    draft: false,
  })

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
      image: null,
      draft: true,      
    }
  }

  // 初期値の設定
  useEffect(() => {
    if (item) {
      const initialData = {
        date: item.date,
        title: item.title,
        comment: item.comment,
        image: item.image,
        will_delete_image: '',
        draft: item.draft,
      }
      setInputs(initialData)
      dispatchMain({ type: 'SET_IS_DIRTY', payload: false })
    }
  }, [item?.id])

  const [state, formAction, isPending] = useActionState(updateItemAction, initialState)
  const [searchPath] = useQueryParam<string, string>('path', withDefault<string, string, string>(StringParam, null))
  
  // フォーム入力の変更ハンドラー
  const handleInputChange = useCallback((field: string) => (event?: React.ChangeEvent<HTMLInputElement>) => {
    const changes: Partial<WalkFields> = {}
    switch (field) {
    case 'draft':
      changes.draft = event.target.checked
      break
    case 'will_delete_image':
      changes.image = null
      changes.will_delete_image = 'true'
      break
    case 'image':
      changes.image = event.target.files ? event.target.files[0] : null
      changes.will_delete_image = ''
      break
    default:
      changes[field] = event.target.value
    } 
    setInputs(prev => ({
      ...prev,
      ...changes,
    }))
    dispatchMain({ type: 'SET_IS_DIRTY', payload: true })
  }, [dispatchMain, setInputs])

  const handleSubmit = useCallback(() => {
    startTransition(() => {
      const formData = new FormData()
      formData.append('date', inputs.date)
      formData.append('title', inputs.title)
      formData.append('comment', inputs.comment)
      formData.append('draft', inputs.draft ? 'true' : '')
      formData.append('path', searchPath ?? item?.path ?? '')
      formData.append('image', inputs.image ?? '')
      formData.append('will_delete_image', inputs.will_delete_image ?? '')
      if (mode === 'update' && item?.id) {
        formData.append('id', item.id.toString())
      }
      formAction(formData)
    })
  }, [inputs, searchPath, item, mode, formAction])
  
  useEffect(() => {
    if (state.serial > 0) {
      if (state.idTokenExpired) {
        void (async () => {
          await updateIdToken()
          handleSubmit()
        })()
      } else if (state.id) {
        // フォーム送信が成功したらdirtyフラグをリセット
        dispatchMain({ type: 'SET_IS_DIRTY', payload: false })
        
        if (mode === 'update') {
          const index = data.rows.findIndex((row) => row?.id === item.id)
          if (index >= 0) {
            data.rows[index].stale = true
            setData({ rows: data.rows })
          }
        }
        router.push(idToShowUrl(state.id))
      }
    }
  }, [state?.serial])
  
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

  const cancelUrl = mode === 'update' ? idToShowUrl(item.id, searchParams) : `/?${searchParams.toString()}`

  return (
    <Box data-testid="WalkEditor">
      <Paper sx={{ width: '100%', textAlign: 'center', padding: 2 }}>
        <Typography variant="body1" color="error" >{state?.error?.message}</Typography>
        <form name="walk-form">
          <FormGroup row>
            <TextField 
              type="date" 
              name="date" 
              value={inputs.date}
              onChange={handleInputChange('date')}
              variant="standard" 
              label="date" 
              fullWidth 
            />
            <TextField 
              value={inputs.title}
              onChange={handleInputChange('title')}
              name="title" 
              label="title" 
              variant="standard" 
              fullWidth 
            />
            <ImageUploader 
              label="image" 
              name="image" 
              defaultValue={item?.image}
              onChange={handleInputChange('image')}
              onClear={handleInputChange('will_delete_image')}
            />
            <TextField
              multiline
              minRows={4}
              maxRows={20}
              variant="standard"
              value={inputs.comment}
              onChange={handleInputChange('comment')}
              label="comment"
              name="comment"
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={inputs.draft} 
                  onChange={handleInputChange('draft')}
                  value="true" 
                  name="draft" 
                />
              }
              label="draft?"
            />
          </FormGroup>
        </form>
        <Box sx={{ marginTop: 1, textAlign: 'right' }}>
          <Link href={cancelUrl} onClick={interceptLink}>
            <Button 
              color="primary"
            >
              cancel
            </Button>
          </Link>
          <Button 
            data-testid="submit-button" 
            disabled={isPending} 
            onClick={handleSubmit} 
            color="secondary"
          >
            {isPending ? 'Uploading...' : mode}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}

export default WalkEditor
