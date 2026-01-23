import React, {
  useRef, useEffect, useCallback,
} from 'react'
import IconButton from '@mui/material/IconButton'
import FormControlLabel from '@mui/material/FormControlLabel'
import Typography from '@mui/material/Typography'
import Switch from '@mui/material/Switch'
import NavigationArrowForwardIcon from '@mui/icons-material/ArrowForward'
import NavigationArrowBackIcon from '@mui/icons-material/ArrowBack'
import AvFastForwardIcon from '@mui/icons-material/FastForward'
import AvFastRewindIcon from '@mui/icons-material/FastRewind'
import Box from '@mui/material/Box'
import { useMapContext } from '../utils/map-context'
import { useData } from '../utils/data-context'
import { useMainContext } from '../utils/main-context'
import { WalkT } from '@/types'

type PanoramaRefs = {
  panorama?: google.maps.StreetViewPanorama | null
  streetViewService?: google.maps.StreetViewService | null
  panoramaPointsAndHeadings?: Array<[google.maps.LatLng|google.maps.LatLngLiteral, number]> | null
}

const PANORAMA_INTERVAL = 50

const PanoramaBox = () => {
  const [mainState, dispatchMain] = useMainContext()
  const [data] = useData()
  const selectedItem = data.current
  const { overlay, panoramaIndex, panoramaCount } = mainState
  const [mapState] = useMapContext()
  const mapLoaded = !!mapState.map
  const bodyRef = useRef<HTMLElement>(null)
  const refs = useRef<PanoramaRefs>({})
  const handleOverlayChange = (e: React.ChangeEvent<HTMLInputElement>, toggled: boolean) => {
    dispatchMain({ type: 'SET_OVERLAY', payload: toggled })
  }
  const interpolatePoints = (pt1: google.maps.LatLng, pt2: google.maps.LatLng, r: number) => (
    { lat: r * pt2.lat() + (1 - r) * pt1.lat(), lng: r * pt2.lng() + (1 - r) * pt1.lng() }
  )

  const getPanoramaPointsAndHeadings = (path: google.maps.LatLng[]) => {
    if (!path) return null
    const pph: Array<[google.maps.LatLng | google.maps.LatLngLiteral, number]> = []
    const count = path.length
    let way = 0
    let dsum = 0
    let pt2: google.maps.LatLng 
    let h: number
    for (let i = 0; i < count - 1; i += 1) {
      const pt1 = path[i]
      pt2 = path[i + 1]
      const d = google.maps.geometry.spherical.computeDistanceBetween(pt1, pt2)
      h = google.maps.geometry.spherical.computeHeading(pt1, pt2)

      while (way < dsum + d) {
        const pt = interpolatePoints(pt1, pt2, (way - dsum) / d)
        pph.push([pt, h])
        way += PANORAMA_INTERVAL
      }
      dsum += d
    }
    pph.push([pt2, h])
    return pph
  }

  const showPanorama = () => {
    if (!mapLoaded || !refs.current.panoramaPointsAndHeadings) return

    const index = panoramaIndex
    const item = refs.current.panoramaPointsAndHeadings[index]
    const pt = item[0]
    const heading = item[1]
    const pnrm = overlay ? mapState.map.getStreetView() : refs.current.panorama
    const request = {
      location: pt,
      radius: 50,
    }
    void refs.current.streetViewService.getPanorama(request, (data, status) => {
      if (status === google.maps.StreetViewStatus.OK) {
        pnrm.setPano(data.location.pano)
        pnrm.setPov({ heading, pitch: 0 })
        pnrm.setVisible(true)
      } else {
        pnrm.setVisible(false)
      }
    })
    google.maps.event.trigger(pnrm, 'resize')
  }

  const setStreetView = (pnrm: google.maps.StreetViewPanorama | null) => {
    if (mapState.map) mapState.map.setStreetView(pnrm)
  }
  const updatePath = (item: WalkT | null) => {
    if (!mapLoaded) return
    if (!item) {
      const pnrm = overlay ? mapState.map.getStreetView() : refs.current.panorama
      if (pnrm) {
        pnrm.setVisible(false)
      }
      setStreetView(refs.current.panorama)
      return
    }
    const path = google.maps.geometry.encoding.decodePath(item.path)
    refs.current.panoramaPointsAndHeadings = getPanoramaPointsAndHeadings(path)
    dispatchMain({ type: 'SET_PANORAMA_COUNT', payload: refs.current.panoramaPointsAndHeadings.length })
    // setTimeout(() => {this.props.setPanoramaIndex(0);}, 0);
    dispatchMain({ type: 'SET_PANORAMA_INDEX', payload: 0 })
    showPanorama()
  }

  // unmount
  useEffect(() => () => {
    setStreetView(refs.current.panorama)
  }, [])

  useEffect(() => {
    if (mapLoaded && !refs.current.panorama) {
      refs.current.streetViewService = new google.maps.StreetViewService()
      bodyRef.current.addEventListener('touchmove', (e) => {
        e.stopPropagation()
        return true
      }, true)
      refs.current.panorama = new google.maps.StreetViewPanorama(bodyRef.current, {
        addressControl: true,
        enableCloseButton: false,
      })
    }
  }, [mapLoaded])

  useEffect(() => {
    if (!mapLoaded) return
    if (overlay) {
      setStreetView(null)
    } else {
      setStreetView(refs.current.panorama)
    }
    showPanorama()
  }, [overlay, mapLoaded])

  useEffect(() => {
    updatePath(selectedItem)
  }, [selectedItem, mapLoaded])

  useEffect(() => {
    showPanorama()
  }, [panoramaIndex])

  const createPanoramaIndexButtonClickCB = (d: number) => () => (
    dispatchMain({ type: 'SET_PANORAMA_INDEX', payload: panoramaIndex + d })
  )
  const panoramaIndexButtonClickCBs = {
    '-10': useCallback(createPanoramaIndexButtonClickCB(-10), [panoramaIndex]),
    '-1': useCallback(createPanoramaIndexButtonClickCB(-1), [panoramaIndex]),
    '+1': useCallback(createPanoramaIndexButtonClickCB(1), [panoramaIndex]),
    '+10': useCallback(createPanoramaIndexButtonClickCB(10), [panoramaIndex]),
  }
  return (
    <div>
      <div>
        <FormControlLabel
          control={(
            <Switch
              checked={overlay}
              onChange={handleOverlayChange}
            />
          )}
          label="overlay"
        />
      </div>
      <Box data-testid="panorama-box" sx={{ width: '100%', height: '30vh', display: overlay ? 'none' : 'block' }} ref={bodyRef} />
      <Box sx={{
        display: 'flex',
        flextDirection: 'row',
        width: '100%',
        textAlign: 'center',
        height: 36,
      }}
      >
        <IconButton data-testid="backward-10-button" onClick={panoramaIndexButtonClickCBs['-10']} size="large"><AvFastRewindIcon /></IconButton>
        <IconButton data-testid="backward-1-button" onClick={panoramaIndexButtonClickCBs['-1']} size="large"><NavigationArrowBackIcon /></IconButton>
        <Typography variant="body2" style={{ flexGrow: 1 }}>
          <span>{panoramaIndex + 1}{' '}</span>
          {' '}
          /
          {' '}
          <span>{panoramaCount}{' '}</span>
        </Typography>
        <IconButton data-testid="forward-1-button" onClick={panoramaIndexButtonClickCBs['+1']} size="large"><NavigationArrowForwardIcon /></IconButton>
        <IconButton data-testid="forward-10-button" onClick={panoramaIndexButtonClickCBs['+10']} size="large"><AvFastForwardIcon /></IconButton>
      </Box>
    </div>
  )
}

export default PanoramaBox
