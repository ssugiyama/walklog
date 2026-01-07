'use client'
import { DeleteItemState, UserT } from '@/types'
import React, { useState, useCallback, useEffect, useTransition, useActionState } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import Fab from '@mui/material/Fab'
import NavigationArrowForwardIcon from '@mui/icons-material/ArrowForward'
import NavigationArrowBackIcon from '@mui/icons-material/ArrowBack'
import ListIcon from '@mui/icons-material/List'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import NoSsr from '@mui/material/NoSsr'
import PanoramaBox from './panorama-box'
import ElevationBox from './elevation-box'

import { idToEditUrl, idToShowUrl } from '../utils/meta-utils'
import { useData } from '../utils/data-context'
import { useSearchParams } from 'next/navigation'
import { useUserContext } from '../utils/user-context'
import { deleteItemAction } from '@/app/lib/walk-actions'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`item-tabpanel-${index}`}
      aria-labelledby={`item-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ padding: 2, overflow: 'auto' }}>
          {children}
        </Box>
      )}
    </div>
  )
}

const ItemBox = () => {
  const [tabValue, setTabValue] = useState(0)
  const { users, currentUser } = useUserContext()
  const searchParams = useSearchParams()
  const [data] = useData()
  const item = data.current

  const tabChangeCB = useCallback((e: React.SyntheticEvent, value: number) => {
    setTabValue(value)
  }, [])
  
  const initialDeleteState: DeleteItemState = {
    deleted: false,
    idTokenExpired: false,
    serial: 0,
  }
  const { updateIdToken } = useUserContext()
  const [isPending, startTransition] = useTransition()
  const [deleteState, dispatchDelete] = useActionState(deleteItemAction, initialDeleteState)
  const handleDelete = useCallback(() => {
    startTransition(async () => {
      if (window.confirm('Are you sure to delete?')) {
        await dispatchDelete(item?.id)
      }
    })
  }, [item?.id])

  const itemWillRender = !data.isPending && item
  const title = itemWillRender ? `${item.date} : ${item.title} (${item.length.toFixed(1)} km)` : ''
  const image = item?.image
  const dataUser = users.find((u: UserT) => u.uid === item?.uid) ?? null
  const upUrl = `/?${searchParams.toString()}`
  const draft = item?.draft
  let nextUrl = data.nextId && idToShowUrl(data.nextId, searchParams)
  if (!nextUrl && data.offset > 0) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', (Number(data.offset) + 20).toString())
    nextUrl = `/?${params.toString()}&index=${data.offset}`
  }
  const prevUrl = data.prevId && idToShowUrl(data.prevId, searchParams)
  useEffect(() => {
    if (deleteState.serial > 0) {
      if (deleteState.idTokenExpired) {
        startTransition(async () => {
          await updateIdToken()
          await dispatchDelete(item?.id)
        })
      }
    }
  }, [deleteState.serial])

  const sxImageBox = {
    float: { xs: 'none', sm: 'left' },
    width: 320,
    mt: { xs: 0, sm: 2 },
    mr: { xs: 'auto', sm: 2 },
    mb: { xs: 0, sm: 2 },
    ml: { xs: 'auto', sm: 0 },
    display: { xs: 'inherit', sm: 'block' },
  }

  return itemWillRender && 
    <Box data-testid="ItemBox">
      <Paper sx={{ width: '100%', textAlign: 'center', padding: 2 }}>
        <Fab sx={{ float: 'left', marginLeft: 1, marginTop: 1 }} size="small" color="primary" component={Link} href={upUrl}><ListIcon /></Fab>
        <IconButton disabled={!prevUrl} component={Link} href={prevUrl ?? ''} size="large"><NavigationArrowBackIcon /></IconButton>
        <IconButton disabled={!nextUrl} component={Link} href={nextUrl ?? ''} size="large"><NavigationArrowForwardIcon /></IconButton>
        {
          currentUser && item.uid && currentUser.uid === item.uid ? (<IconButton component={Link} href={idToEditUrl(item?.id, searchParams)} size="large" data-testid="edit-button"><EditIcon /></IconButton>) : null
        }
        {
          currentUser && item.uid && currentUser.uid === item.uid ? (<IconButton disabled={isPending} onClick={handleDelete} size="large" data-testid="delete-button"><DeleteIcon /></IconButton>) : null
        }
        <Typography variant="h6" sx={{ fontSize: '100%' }}>{title ?? 'not found'}</Typography>
        <Box sx={{ textAlign: 'right' }}>
          {
            draft ?
              <Chip label="draft" color="warning" /> : dataUser ?
                (
                  <Chip
                    avatar={(
                      <Avatar
                        alt={dataUser.displayName}
                        src={dataUser.photoURL}
                      />
                    )}
                    label={dataUser.displayName}
                    variant="outlined"
                  />
                ) : null
          }
        </Box>
      </Paper>
      <Paper>
        <Tabs
          value={tabValue}
          onChange={tabChangeCB}
          sx={{ margin: '4px 0' }}
          textColor="secondary"
          variant="fullWidth"
        >
          <Tab label="Comment" sx={{ textTransform: 'none' }} />
          <Tab label="Elevation" sx={{ textTransform: 'none' }} />
          <Tab label="StreetView" sx={{ textTransform: 'none' }} />
        </Tabs>
        <TabPanel value={tabValue} index={0}>
          {image &&
            <Box sx={sxImageBox} component="img" src={image} data-testid="item-image" />}
          <Typography
            variant="body2"
            component="div"
            sx={{
              textIndent: '1.2em',
              lineHeight: '1.65',
              letterSpacing: '.1em',
              textAlign: 'justify',
              '& a': {
                color: 'inherit',
              },
            }}
          >
            <ReactMarkdown>{item?.comment ?? ''}</ReactMarkdown>
          </Typography>
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <NoSsr>
            <ElevationBox />
          </NoSsr>
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <PanoramaBox />
        </TabPanel>
      </Paper>
    </Box>
}

export default ItemBox
