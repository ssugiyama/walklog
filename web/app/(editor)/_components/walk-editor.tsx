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
import { updateItemAction } from '@/lib/actions/walk-actions'
import { useData } from '@/lib/utils/data-context'
import { useMainContext } from '@/lib/utils/main-context'
import { idToShowUrl } from '@/lib/utils/meta-utils'
import { useUserContext } from '@/lib/utils/user-context'
import { WalkT } from '@/types'
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
  const { updateIdToken, currentUser, users } = useUserContext()
  const [data, setData] = useData()
  const [localError, setLocalError] = useState<Error | null>(null)
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
  // Read directly from the URL via next/navigation, not nuqs's
  // useQueryState: nuqs broadcasts the raw (unparsed) value passed to any
  // setter for a URL key to every useQueryState hook subscribed to that
  // same key, regardless of each hook's own parser. map.tsx's
  // useQueryState('path', parseAsPath...) sets this key with an array of
  // google.maps.LatLng instances, which would leak into a same-key
  // useQueryState('path', parseAsString) hook here instead of the encoded
  // string it expects - reproduced in production as a corrupted `path`
  // field (the LatLng array's own toString(), not the polyline encoding).
  const encodedSearchPath = searchParams.get('path')

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

  const handleSubmit = useCallback(() => {
    setLocalError(null)
    const image = inputs.image
    if (image instanceof File) {
      if (!image.type?.startsWith('image/')) {
        setLocalError(new Error('Image must be an image file'))
        return
      }
      if (image.size > 2 * 1024 * 1024) {
        setLocalError(new Error('Image size must be 2MB or less'))
        return
      }
    }

    startTransition(() => {
      const formData = new FormData()
      formData.append('date', inputs.date)
      formData.append('title', inputs.title)
      formData.append('comment', inputs.comment)
      formData.append('draft', inputs.draft ? 'true' : '')
      formData.append('path', encodedSearchPath ?? '')
      formData.append('image', image instanceof File ? image : '')
      formData.append('will_delete_image', inputs.will_delete_image ?? '')
      if (mode === 'update' && item?.id) {
        formData.append('id', item.id.toString())
      }
      formAction(formData)
    })
  }, [inputs, encodedSearchPath, item, mode, formAction])

  // Next.js Cache Componentsはページ遷移時に/edit/[id]をアンマウントせず
  // React Activityで非表示にするため、保存成功後の`state`（serial/id）は
  // 再度このページを開いたときも保持される。そのままだとこのeffectが
  // 非表示→表示の遷移で再実行され、二度目に開いた瞬間に/show/[id]へ
  // リダイレクトしてしまうため、既に処理したserialをrefで記録して防ぐ。
  const redirectedSerialRef = useRef(0)
  useEffect(() => {
    if (state.serial > 0) {
      if (state.idTokenExpired) {
        void (async () => {
          await updateIdToken()
          handleSubmit()
        })()
      } else if (state.id && redirectedSerialRef.current !== state.serial) {
        redirectedSerialRef.current = state.serial
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
  if (!dataUser?.active) {
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
            disabled={isPending || (mode === 'create' && !encodedSearchPath)}
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
