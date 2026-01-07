'use client'

import React, {
  useRef, useEffect, useState, MouseEventHandler
} from 'react'
import { createRoot } from 'react-dom/client'
import { Box, Button } from '@mui/material'
import moment from 'moment'
import ConfirmModal, { APPEND_PATH_CONFIRM_INFO } from './confirm-modal'
import createGsiMapType from '../utils/gsi-map-type'
import { useConfig } from '../utils/config'
import { useSearchParams } from 'next/navigation'
import { useQueryParam, StringParam, withDefault, NumberParam } from 'use-query-params'
import { getCityAction } from '../../app/lib/walk-actions'
import { useData } from '../utils/data-context'
import { useMapContext } from '../utils/map-context'
import { useMainContext } from '../utils/main-context'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { ShapeStyles, WalkT } from '@/types'
import { idToShowUrl } from '../utils/meta-utils'
import type PathManager from '../utils/path-manager'
import type PolygonManager from '../utils/polygon-manager'
import Link from 'next/link'

const RESIZE_INTERVAL = 500
const GSI_MAP_TYPE = 'gsi'
const PRECISION = 0.0001

type MapRefs = {
  filter?: string
  cities?: string
  selectedPath?: string
  view?: string
  autoGeolocation?: boolean
  map?: google.maps.Map
  distanceWidget?: google.maps.Circle
  pathInfoWindow?: google.maps.InfoWindow
  centerIntervalID?: number
  pathManager?: PathManager
  polygonManager?: PolygonManager
  shapeStyles?: ShapeStyles
  searchPath?: string
  radius?: number
  fetching?: boolean
  searchCenter?: string
  clickedItem?: WalkT,
  resizeIntervalID?: NodeJS.Timeout | null
  elevationInfoWindow?: google.maps.InfoWindow
  marker?: google.maps.marker.AdvancedMarkerElement
  interceptLink?: MouseEventHandler<HTMLButtonElement|HTMLAnchorElement>
  initialized: boolean
}

const Map = (props) => {
  const [mainState, dispatchMain, interceptLink] = useMainContext()
  const [, setMapState] = useMapContext()
  const config = useConfig()
  const [searchPath, setSearchPath] = useQueryParam('path', withDefault(StringParam, ''))
  const [searchCenter, setSearchCenter] = useQueryParam('center', withDefault(StringParam, config.defaultCenter))
  const [radius, setRadius] = useQueryParam('radius', withDefault(NumberParam, config.defaultRadius))
  const [cities, setCities] = useQueryParam('cities', withDefault(StringParam, ''))
  const [data] = useData()
  const { rows, current } = data
  const refs = useRef<MapRefs>({ initialized: false })
  const rc = refs.current
  rc.cities = cities
  rc.searchPath = searchPath
  rc.autoGeolocation = mainState.autoGeolocation
  const mapElemRef = useRef(null)
  const downloadRef = useRef(null)
  const uploadRef = useRef(null)
  const [confirmInfo, setConfirmInfo] = useState<{ open: boolean, resolve?: (boolean) => void }>({ open: false })
  const searchParams = useSearchParams()
  const filter = searchParams.get('filter')
  rc.filter = filter
  rc.searchCenter = searchCenter
  rc.radius = radius
  rc.interceptLink = interceptLink

  const addPoint = (lat, lng, append) => {
    const pt = new google.maps.LatLng(lat, lng)
    rc.pathManager.applyPath([pt], append)
  }
  const uploadPath = () => {
    setTimeout(() => uploadRef.current.click(), 0)
  }
  const downloadPath = () => {
    const content = rc.pathManager.selectionAsGeoJSON()
    const blob = new Blob([content], { type: 'application/json' })
    const elem = downloadRef.current
    elem.href = window.URL.createObjectURL(blob)
    setTimeout(() => { elem.click(); window.URL.revokeObjectURL(elem.href) }, 0)
  }
  const clearPaths = (retainTemporaryAndSelection) => {
    rc.pathManager.deleteAll(retainTemporaryAndSelection)
  }
  const deleteSelectedPath = () => {
    rc.pathManager.deleteSelection()
  }
  const addPaths = (items) => {
    items.forEach((item) => rc.pathManager.showPath(item.path, false, false, item))
  }

  const pathChanged = () => {
    if (!rc.pathManager) return
    const nextPath = rc.pathManager.getEncodedSelection()
    if (searchPath !== nextPath) {
      setSearchPath(nextPath)
      if (nextPath) {
        const pair = rc.pathManager.searchPolyline(nextPath)
        const item = pair && pair[1]
        if (rc.autoGeolocation || item) {
          rc.clickedItem = item
          const content = '<span id="path-info-window-content">foo</span>'
          rc.pathInfoWindow.setContent(content)
          rc.pathInfoWindow.open(rc.map)
          const pos = rc.autoGeolocation ?
            rc.pathManager.lastAppendLatLng() :
            rc.pathManager.getLastClickLatLng()
          if (pos) rc.pathInfoWindow.setPosition(pos)
        } else {
          rc.pathInfoWindow.close()
        }
      } else {
        rc.pathInfoWindow.close()
      }
    } else {
      rc.pathInfoWindow.close()
    }
  }

  const processUpload = (e1) => {
    const file = e1.target.files[0]
    const reader = new FileReader()
    reader.addEventListener('loadend', (e2) => {
      const obj = JSON.parse(e2.target.result.toString())
      const { coordinates } = obj
      const pts = coordinates.map((item) => (new google.maps.LatLng(item[1], item[0])))
      const path = google.maps.geometry.encoding.encodePath(new google.maps.MVCArray(pts))
      setSearchPath(path)
    })
    reader.readAsText(file)
  }

  const handleResize = () => {
    if (!rc.resizeIntervalID) {
      rc.resizeIntervalID = setTimeout(() => {
        google.maps.event.trigger(rc.map, 'resize')
        rc.resizeIntervalID = null
      }, RESIZE_INTERVAL)
    }
  }

  const addCity = (id) => {
    const newCities = Array.from(new Set(rc.cities.split(/,/).filter((elm) => elm).concat(id))).join(',')
    setCities(newCities)
  }

  const initMap = async () => {
    if (rc.initialized) return
    rc.shapeStyles = config.shapeStyles
    const mapTypeIds = config.mapTypeIds.split(/,/)
    const cs = rc.searchCenter.split(/,/)
    const options = {
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      disableDoubleClickZoom: true,
      scaleControl: true,
      streetViewControl: true,
      mapId: config.mapId,
      mapTypeControlOptions: {
        position: google.maps.ControlPosition.TOP_LEFT,
        mapTypeIds,
        style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
      },
      center: { lat: parseFloat(cs[0]), lng: parseFloat(cs[1]) },
      zoom: config.defaultZoom,
    }
    mapElemRef.current.addEventListener('touchmove', (event) => {
      event.preventDefault()
    })
    rc.map = new google.maps.Map(mapElemRef.current, options)
    if (mapTypeIds.includes(GSI_MAP_TYPE)) {
      createGsiMapType(GSI_MAP_TYPE, rc.map)
    }
    google.maps.event.addListener(rc.map, 'click', async (event) => {
      if (['neighborhood', 'start', 'end'].includes(rc.filter)) {
        rc.distanceWidget.setCenter(event.latLng.toJSON())
      } else if (rc.filter === 'cities') {
        const response = await getCityAction({ latitude: event.latLng.lat(), longitude: event.latLng.lng() })
        rc.polygonManager.addCache(response[0].jcode, response[0].theGeom)
        addCity(response[0].jcode)
      }
    })
    google.maps.event.addListener(rc.map, 'tilesloaded', () => {
      google.maps.event.clearListeners(rc.map, 'tilesloaded')
    })
    const { default: PathManager } = await import('../utils/path-manager')
    rc.pathManager = new PathManager({ map: rc.map, styles: rc.shapeStyles.polylines })
    google.maps.event.addListener(rc.pathManager, 'length_changed', pathChanged)
    google.maps.event.addListener(rc.pathManager, 'selection_changed', pathChanged)
    google.maps.event.addListener(rc.pathManager, 'drawfinish', async (path) => {
      const append = await new Promise((resolve) => {
        if (rc.searchPath) {
          setConfirmInfo({ open: true, resolve })
        } else {
          resolve(false)
        }
      })
      setConfirmInfo({ open: false })
      rc.pathManager.applyPath(path, append)
    })
    const { default: PolygonManager } = await import('../utils/polygon-manager')
    rc.polygonManager = new PolygonManager({ map: rc.map, styles: rc.shapeStyles.polygons, addCity })
    google.maps.event.addListener(rc.polygonManager, 'polygon_deleted', (id) => {
      const citiesArray = rc.cities.split(/,/)
      const index = citiesArray.indexOf(id)
      if (index >= 0) {
        citiesArray.splice(index, 1)
        const newCities = citiesArray.join(',')
        setCities(newCities)
      }
    })

    rc.pathInfoWindow = new google.maps.InfoWindow()
    google.maps.event.addListener(rc.pathInfoWindow, 'domready', () => {
      let content
      if (rc.autoGeolocation) {
        content = `geolocation at ${moment().format('HH:mm')}`
      } else {
        const item = rc.clickedItem
        const url = idToShowUrl(item.id, searchParams)
        content = (
          <Button component={Link} href={url} onClick={rc.interceptLink}>
            {item.date}
            :
            {' '}
            {item.title}
          </Button>
        )
      }
      const root = createRoot(document.getElementById('path-info-window-content'))
      root.render(content)
    })
    google.maps.event.addListener(rc.pathInfoWindow, 'closeclick', () => {
      if (rc.autoGeolocation) {
        dispatchMain({ type: 'SET_AUTO_GEOLOCATION', payload: false })
      }
      rc.pathInfoWindow.close()
    })
    const c = rc.searchCenter.split(/,/)
    const center = { lat: parseFloat(c[0]), lng: parseFloat(c[1]) }
    const circleOpts = {
      ...rc.shapeStyles.circle,
      center: center,
      radius: radius,
    }
    rc.distanceWidget = new google.maps.Circle(circleOpts)
    google.maps.event.addListener(rc.distanceWidget, 'center_changed', () => {
      const lat = rc.distanceWidget.getCenter().lat()
      const lng = rc.distanceWidget.getCenter().lng()
      const newCenter = lat.toFixed(5) + ',' + lng.toFixed(5)
      if (newCenter === rc.searchCenter) return
      setSearchCenter(newCenter)
    })
    google.maps.event.addListener(rc.distanceWidget, 'radius_changed', () => {
      const r = rc.distanceWidget.getRadius()
      if (Math.abs(rc.radius - r) < PRECISION) return
      setRadius(r)
    })
    rc.elevationInfoWindow = new google.maps.InfoWindow()
    await google.maps.importLibrary('marker')
    rc.marker = new google.maps.marker.AdvancedMarkerElement()
    window.addEventListener('resize', handleResize)
    uploadRef.current.addEventListener('change', (e) => {
      processUpload(e)
    })
    setMapState({
      map: rc.map,
      pathManager: rc.pathManager,
      polygonManager: rc.polygonManager,
      pathInfoWindow: rc.pathInfoWindow,
      distanceWidget: rc.distanceWidget,
      elevationInfoWindow: rc.elevationInfoWindow,
      marker: rc.marker,
      addPoint,
      uploadPath,
      downloadPath,
      clearPaths,
      addPaths,
      deleteSelectedPath,
    })
    rc.initialized = true
  }

  useEffect(() => { if (rc.initialized) pathChanged() }, [rc.autoGeolocation])

  useEffect(() => {
    let isMounted = true;
    setOptions({ 
      key: config.googleApiKey,
      v: config.googleApiVersion,
      libraries: ['geometry', 'marker', 'elevation'],
    });
    importLibrary('core').then(async () => {
      if (isMounted) {
        await initMap()
      }
    })
    importLibrary('geocoding').then(() => { })
    // clean up
    return () => {
      isMounted = false;
    }
  }, [])

  const citiesChanges = () => {
    const a = rc.cities.split(/,/)
    const b = rc.polygonManager.idSet()
    if (a.length !== b.size) return true
    if (a.some((j) => !b.has(j))) return true
    return false
  }
  useEffect(() => {
    if (!rc.initialized) return
    if (searchPath &&
      searchPath !== rc.pathManager.getEncodedSelection()) {
      rc.pathManager.showPath(searchPath, true)
    }
  }, [searchPath, rc.initialized])
  useEffect(() => {
    if (!rc.initialized) return
    clearPaths(true)
    addPaths(rows)
  }, [rows, rc.initialized])
  useEffect(() => {
    if (!rc.initialized) return
    if (current &&
      current.path !== rc.pathManager.getEncodedCurrent()) {
      rc.pathManager.showPath(current.path, false, true, current)
    } else if (!current) {
      rc.pathManager.set('current', null)
    }
  }, [current, rc.initialized])

  useEffect(() => {
    if (!rc.initialized) return
    if (['neighborhood', 'start', 'end'].includes(filter)) {
      rc.distanceWidget.setMap(rc.map)
      rc.distanceWidget.set('radius', radius)
      const c = searchCenter.split(/,/)
      const center = { lat: parseFloat(c[0]), lng: parseFloat(c[1]) }
      rc.distanceWidget.setCenter(center)
    } else {
      rc.distanceWidget.setMap(null)
    }
  }, [filter, searchCenter, radius, rc.initialized])

  useEffect(() => {
    if (!rc.initialized) return
    if (rc.filter === 'cities' && citiesChanges() && !rc.fetching) {
      rc.polygonManager.deleteAll()
      if (rc.cities) {
        rc.fetching = true;
        (async () => {
          const jcodes = rc.cities.split(/,/)
          const uncached: string[] = []
          jcodes.forEach((jcode) => {
            const geom = rc.polygonManager.getFromCache(jcode)
            if (geom) {
              rc.polygonManager.addPolygon(jcode, geom)
            } else {
              uncached.push(jcode)
            }
          })
          const cities = await getCityAction({ jcodes: uncached })
          cities.forEach((city) => {
            rc.polygonManager.addPolygon(city.jcode, city.theGeom)
          })
        })()
        rc.fetching = false
      }
    }
    if (filter === 'cities') {
      rc.polygonManager.showAll()
    } else {
      rc.polygonManager.hideAll()
    }

  }, [filter, cities, rc.initialized])

  return (
    <>
      <Box
        data-testid="map"
        ref={mapElemRef}
        sx={{
          my: 0,
        }}
        {...props}
      />
      <a ref={downloadRef} style={{ display: 'none' }} download="walklog.json" href="#dummy">download</a>
      <input ref={uploadRef} type="file" style={{ display: 'none' }} />
      <ConfirmModal
        {...APPEND_PATH_CONFIRM_INFO}
        open={confirmInfo.open}
        resolve={confirmInfo.resolve}
      />
    </>
  )
}

export default Map
