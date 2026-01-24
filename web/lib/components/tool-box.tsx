import React, {
  useEffect, useRef, useState, useCallback,
} from 'react'
import Draw from '@mui/icons-material/Draw'
import NavigationRefresh from '@mui/icons-material/Block'
import FileDownload from '@mui/icons-material/GetApp'
import FileUpload from '@mui/icons-material/Publish'
import SearchIcon from '@mui/icons-material/Search'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import Circle from '@mui/icons-material/Circle'
import Close from '@mui/icons-material/Close'
import Straighten from '@mui/icons-material/Straighten'
import Numbers from '@mui/icons-material/Numbers'
import {
  TextField,
  Drawer,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  IconButton,
} from '@mui/material'
import { useMapContext } from '../utils/map-context'
import { useMainContext } from '../utils/main-context'
import ConfirmModal, { APPEND_PATH_CONFIRM_INFO } from './confirm-modal'
import { useConfig } from '../utils/config'
import { useQueryParam } from 'use-query-params/dist/useQueryParam'
import { withDefault } from 'serialize-query-params/dist/withDefault'
import { StringParam } from 'serialize-query-params/dist/params'

const AUTO_GEOLOCATION_INTERVAL = 60000

type ConfirmInfo = {
  open: boolean
  resolve?: (append: boolean) => void
}

const ToolBox = (props) => {
  const [mainState, dispatchMain] = useMainContext()
  const [mapState] = useMapContext()
  const pathManager = mapState.pathManager
  const [selectedPath] = useQueryParam<string, string>('path', withDefault<string, string, string>(StringParam, null))
  const autoGeolocation = mainState.autoGeolocation
  const [location, setLocation] = useState('')
  const geocoder = useRef<google.maps.Geocoder>(null)
  const length: number = pathManager?.get('length') as number ?? 0
  const config = useConfig()
  const appVersion = `v${config.appVersion}`
  const { map, marker, addPoint, downloadPath, uploadPath, clearPaths } = mapState
  const [confirmInfo, setConfirmInfo] = useState<ConfirmInfo>({ open: false })
  const showMarker = (pos: GeolocationPosition) => {
    marker.position = { lat: pos.coords.latitude, lng: pos.coords.longitude }
    marker.map = map
    map.setCenter(marker.position)
  }
  const addCurrentPosition = (pos: GeolocationPosition, append: boolean) => {
    setConfirmInfo({ open: false })
    addPoint(pos.coords.latitude, pos.coords.longitude, append)
  }
  const getCurrentPosition = (onSuccess: (pos: GeolocationPosition) => void, onFailure?: () => void) => {
    navigator.geolocation.getCurrentPosition((pos) => {
      onSuccess(pos)
    }, () => {
      if (onFailure) onFailure()
    })
  }
  useEffect(() => {
    if (autoGeolocation) {
      const intervalId = setInterval(() => {
        getCurrentPosition((pos: GeolocationPosition) => {
          addCurrentPosition(pos, true)
        }, () => window.alert('Unable to retrieve your location'))
      }, AUTO_GEOLOCATION_INTERVAL)
      return () => {
        clearInterval(intervalId)
      }
    }
    return () => { }
  }, [autoGeolocation])
  const toggleRecordCB = useCallback(() => {
    if (!autoGeolocation && navigator.geolocation) {
      getCurrentPosition(async (pos) => {
        dispatchMain({ type: 'OPEN_SNACKBAR', payload: 'start following your location' })
        const append: boolean = await new Promise((resolve) => {
          if (selectedPath) {
            setConfirmInfo({ open: true, resolve })
          } else {
            resolve(false)
          }
        })
        addCurrentPosition(pos, append)
      }, () => {
        window.alert('Unable to retrieve your location')
      })
    } else if (!autoGeolocation) {
      window.alert('Geolocation is not supported by your browser')
    } else {
      dispatchMain({ type: 'OPEN_SNACKBAR', payload: 'stop following your location' })
    }
    dispatchMain({ type: 'SET_AUTO_GEOLOCATION', payload: !autoGeolocation })
  }, [autoGeolocation, selectedPath, dispatchMain, pathManager, addPoint])

  const currentLocationCB = useCallback(() => {
    if (navigator.geolocation) {
      getCurrentPosition((pos) => {
        showMarker(pos)
      }, () => {
        window.alert('Unable to retrieve your location')
      })
    }
  }, [marker, map])

  const locationChangeCB = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value), [])
  const submitLocationCB = useCallback(async (e: React.FocusEvent | React.KeyboardEvent) => {
    if (!location) return
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return
    if (!geocoder.current) {
      await google.maps.importLibrary('geocoding')
      geocoder.current = new google.maps.Geocoder()
    }
    void geocoder.current.geocode({ address: location }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK) {
        marker.position = { lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() }
        marker.map = map
        map.setCenter(marker.position)
      } else {
        window.alert(`Geocode was not successful for the following reason: ${status}`)
      }
    })
  }, [location])

  const closeButtonStyle: React.CSSProperties = {
    position: 'fixed',
    left: 'calc(120px + env(safe-area-inset-left))',
    top: 0,
    zIndex: 100,
  }
  return (
    <Drawer variant="persistent" anchor="left" {...props}>
      <IconButton
        size="small"
        style={closeButtonStyle}
        onClick={() => dispatchMain({ type: 'CLOSE_TOOL_BOX' })}
      >
        <Close />
      </IconButton>
      <List
        dense
        subheader={(
          <ListSubheader>
            path
          </ListSubheader>
        )}
      >
        <ListItem>
          <ListItemButton
            onClick={() => pathManager.startDraw()}
            disableGutters
            dense
          >
            <ListItemIcon>
              <Draw />
            </ListItemIcon>
            <ListItemText primary="draw" />
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemButton onClick={() => clearPaths(true)} disableGutters dense>
            <ListItemIcon>
              <NavigationRefresh />
            </ListItemIcon>
            <ListItemText primary="clear" />
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemButton
            onClick={() => downloadPath()}
            disabled={!selectedPath}
            disableGutters
            dense
          >
            <ListItemIcon>
              <FileDownload />
            </ListItemIcon>
            <ListItemText primary="download" />
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemButton onClick={() => uploadPath()} disableGutters dense>
            <ListItemIcon>
              <FileUpload />
            </ListItemIcon>
            <ListItemText primary="upload" />
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemButton onClick={toggleRecordCB} disableGutters dense>
            <ListItemIcon sx={{ color: autoGeolocation ? 'warning.main' : '' }}>
              <Circle />
            </ListItemIcon>
            <ListItemText primary="record" />
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemIcon><Straighten /></ListItemIcon>
          <ListItemText primary={`${length.toFixed(1)}km`} />
        </ListItem>
      </List>
      <Divider />
      <List
        dense
        subheader={(
          <ListSubheader>
            move
          </ListSubheader>
        )}
      >
        <ListItem>
          <ListItemIcon>
            <SearchIcon />
          </ListItemIcon>
          <TextField
            placeholder="location..."
            variant="standard"
            onChange={locationChangeCB}
            onBlur={submitLocationCB}
            onKeyDown={submitLocationCB}
          />
        </ListItem>
        <ListItem>
          <ListItemButton onClick={currentLocationCB} disableGutters dense>
            <ListItemIcon>
              <MyLocationIcon />
            </ListItemIcon>
            <ListItemText primary="here" />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
      <List
        dense
        subheader={(
          <ListSubheader>
            version
          </ListSubheader>
        )}
      >
        <ListItem>
          <ListItemIcon><Numbers /></ListItemIcon>
          <ListItemText primary={appVersion} />
        </ListItem>
      </List>
      <ConfirmModal
        {...APPEND_PATH_CONFIRM_INFO}
        open={confirmInfo.open}
        resolve={confirmInfo.resolve}
      />
    </Drawer>
  )
}

export default ToolBox
