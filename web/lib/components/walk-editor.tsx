'use client'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import Paper from '@mui/material/Paper'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import moment from 'moment'
import { nanoid } from 'nanoid'
import Link from 'next/link'
import {
  forbidden,
  unauthorized,
  useRouter,
  useSearchParams,
} from 'next/navigation'
import React, {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { StringParam, useQueryParam, withDefault } from 'use-query-params'
import { updateItemAction } from '@/app/lib/walk-actions'
import { deleteImage, uploadImage } from '@/lib/utils/firebase-storage'
import { WalkT } from '@/types'
import { useConfig } from '../utils/config'
import { useData } from '../utils/data-context'
import { useMainContext } from '../utils/main-context'
import { idToShowUrl } from '../utils/meta-utils'
import { useUserContext } from '../utils/user-context'
import ImageUploader from './image-uploader'

type WalkFields = {
  date: string
  title: string
  comment: string
  image: File | string | null
  will_delete_image: string
  draft: boolean
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
  const [localError, setLocalError] = useState<Error | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const uploadedThisSubmitRef = useRef<string | null>(null)
  const oldImageToDeleteRef = useRef<string | null>(null)
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

  const [state, formAction, isPending] = useActionState(
    updateItemAction,
    initialState,
  )
  const [searchPath] = useQueryParam<string, string>(
    'path',
    withDefault<string, string, string>(StringParam, null),
  )

  // フォーム入力の変更ハンドラー
  const handleInputChange = useCallback(
    (field: string) => (event?: React.ChangeEvent<HTMLInputElement>) => {
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
      setInputs((prev) => ({
        ...prev,
        ...changes,
      }))
      dispatchMain({ type: 'SET_IS_DIRTY', payload: true })
    },
    [dispatchMain, setInputs],
  )

  const handleSubmit = useCallback(async () => {
    setLocalError(null)
    let image = inputs.image
    if (image instanceof File) {
      const file = image
      if (!file.type?.startsWith('image/')) {
        setLocalError(new Error('Image must be an image file'))
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        setLocalError(new Error('Image size must be 2MB or less'))
        return
      }
      const match = file.name.match(/\.\w+$/)
      const ext = match ? match[0] : ''
      const storagePath = `${config.imagePrefix}/${currentUser.uid}-${inputs.date}-${nanoid(4)}${ext}`
      setIsUploading(true)
      try {
        image = await uploadImage(file, storagePath)
      } catch (error) {
        setLocalError(error as Error)
        return
      } finally {
        setIsUploading(false)
      }
      uploadedThisSubmitRef.current = image
      // Swap the File for its uploaded URL so a idTokenExpired retry reuses
      // it instead of uploading the same file again.
      setInputs((prev) => ({ ...prev, image }))
    }
    oldImageToDeleteRef.current =
      item?.image && item.image !== image ? item.image : null

    startTransition(() => {
      const formData = new FormData()
      formData.append('date', inputs.date)
      formData.append('title', inputs.title)
      formData.append('comment', inputs.comment)
      formData.append('draft', inputs.draft ? 'true' : '')
      formData.append('path', searchPath ?? item?.path ?? '')
      formData.append('image', typeof image === 'string' ? image : '')
      formData.append('will_delete_image', inputs.will_delete_image ?? '')
      if (mode === 'update' && item?.id) {
        formData.append('id', item.id.toString())
      }
      formAction(formData)
    })
  }, [
    inputs,
    searchPath,
    item,
    mode,
    formAction,
    config.imagePrefix,
    currentUser,
  ])

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
        uploadedThisSubmitRef.current = null
        if (oldImageToDeleteRef.current) {
          void deleteImage(oldImageToDeleteRef.current)
          oldImageToDeleteRef.current = null
        }

        if (mode === 'update') {
          const index = data.rows.findIndex((row) => row?.id === item.id)
          if (index >= 0) {
            data.rows[index].stale = true
            setData({ rows: data.rows })
          }
        }
        router.push(idToShowUrl(state.id))
      } else if (uploadedThisSubmitRef.current) {
        // The save failed after we'd already uploaded a new image this
        // submission; don't leave it orphaned in storage.
        void deleteImage(uploadedThisSubmitRef.current)
        uploadedThisSubmitRef.current = null
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

  const cancelUrl =
    mode === 'update'
      ? idToShowUrl(item.id, searchParams)
      : `/?${searchParams.toString()}`

  return (
    <Box data-testid="WalkEditor">
      <Paper sx={{ width: '100%', textAlign: 'center', padding: 2 }}>
        <Typography variant="body1" color="error">
          {localError?.message ?? state?.error?.message}
        </Typography>
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
          <Button
            color="primary"
            component={Link}
            href={cancelUrl}
            onClick={interceptLink}
          >
            cancel
          </Button>
          <Button
            data-testid="submit-button"
            disabled={isPending || isUploading}
            onClick={handleSubmit}
            color="secondary"
          >
            {isPending || isUploading ? 'Uploading...' : mode}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}

export default WalkEditor
