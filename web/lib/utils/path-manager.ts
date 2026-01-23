/* eslint new-cap: 'off' */
import { WalkT } from '@/types'
import jsSHA1 from 'jssha/dist/sha1'
import {
  GeoJSONStoreFeatures,
  GeoJSONStoreGeometries,
  HexColor,
  TerraDraw,
  TerraDrawLineStringMode,
} from 'terra-draw'
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter'

type PathManagerOptions = {
  map?: google.maps.Map
  styles?: {
    new: google.maps.PolylineOptions
    normal: google.maps.PolylineOptions
    selected: google.maps.PolylineOptions
    current: google.maps.PolylineOptions
  }
}

export default class PathManager extends google.maps.MVCObject {
  polylines: { [key: string]: [google.maps.Polyline, WalkT | null] }
  draw: TerraDraw | null = null
  selection: google.maps.Polyline | null = null
  current: google.maps.Polyline | null = null
  lastClickLatLng: google.maps.LatLng | null = null
  map: google.maps.Map
  styles: {
    new: google.maps.PolylineOptions
    normal: google.maps.PolylineOptions
    selected: google.maps.PolylineOptions
    current: google.maps.PolylineOptions
  }
  
  constructor(optOptions: PathManagerOptions | null = null) {
    super()
    const options = optOptions ?? {}
    this.polylines = {}
    this.map = options.map
    this.styles = options.styles
    this.draw = new TerraDraw({
      adapter: new TerraDrawGoogleMapsAdapter({ map: this.map, lib: google.maps, coordinatePrecision: 9 }),
      modes: [
        new TerraDrawLineStringMode({
          editable: true,
          styles: { 
            lineStringColor: this.styles.new.strokeColor as HexColor,
            lineStringWidth: this.styles.new.strokeWeight,
          },
          pointerDistance: 2,
        }),
      ],
    })

    this.draw.on('ready', () => {
      this.draw.on('finish', (id: string, context: { action: string, mode: string }) => {
        if (context.action !== 'draw') return
        const feature: GeoJSONStoreFeatures<GeoJSONStoreGeometries> = this.draw.getSnapshotFeature(id)
        if (feature?.geometry.type === 'LineString') {
          const path: google.maps.LatLng[] = feature.geometry.coordinates.map(
            (coord: number[]) => new google.maps.LatLng(coord[1], coord[0]),
          )
          this.draw.clear()
          this.draw.stop()
          google.maps.event.trigger(this, 'drawfinish', path)
        }
      })
    })
    this.set('length', 0)
    this.set('prevSelection', null)
    this.set('prevCurrent', null)
    this.lastClickLatLng = null
  }

  styles_changed() {
    this.draw?.updateModeOptions<typeof TerraDrawLineStringMode>('linestring', {
      styles: {
        lineStringColor: this.styles.new.strokeColor as HexColor,
        lineStringWidth: this.styles.new.strokeWeight,
      },
    })
    Object.keys(this.polylines).forEach((key) => {
      const [pl] = this.polylines[key]
      pl.setOptions(this.getPolylineStyle(pl))
    })
  }

  applyPath(path: google.maps.LatLng[], append: boolean) {
    if (this.selection && append) {
      if (this.current === this.selection) {
        const pl = new google.maps.Polyline({})
        const newpath = Object.assign([], this.selection.getPath().getArray())
        newpath.push(...path)
        pl.setPath(newpath)
        this.addPolyline(pl)
        this.set('selection', pl)
      } else {
        const ar = this.selection.getPath().getArray()
        ar.push(...path)
        this.selection.setPath(ar)
        this.updateLength()
      }
    } else {
      const pl = new google.maps.Polyline({})
      pl.setPath(path)
      this.addPolyline(pl)
      this.set('selection', pl)
    }
  }

  static pathToHash(path: string | google.maps.LatLng[] | null): string | null {
    if (!path) return null
    const key = typeof path === 'string' ? path : google.maps.geometry.encoding.encodePath(path)
    const obj = new jsSHA1('SHA-1', 'TEXT')
    obj.update(key)
    return obj.getHash('B64')
  }

  deletePolyline(pl: google.maps.Polyline) {
    if (pl === this.selection) {
      this.set('selection', null)
    }
    if (pl === this.current) {
      return
    }
    const key = PathManager.pathToHash(pl.getPath().getArray())
    pl.setMap(null)
    delete this.polylines[key]
  }

  deleteSelection() {
    if (this.selection !== null) {
      const key = PathManager.pathToHash(this.getEncodedSelection())
      this.selection.setMap(null)
      this.set('selection', null)
      delete this.polylines[key]
    }
  }

  deleteAll(retainTemporaryAndSelection) {
    if (!retainTemporaryAndSelection) {
      this.set('selection', null)
    }
    // retain current
    const currentKey = PathManager.pathToHash(this.getEncodedCurrent())
    Object.keys(this.polylines).forEach((key) => {
      if (key !== currentKey) {
        const [pl, item] = this.polylines[key]
        if (!retainTemporaryAndSelection || (item && pl !== this.selection)) {
          pl.setMap(null)
          delete this.polylines[key]
        }
      }
    })
  }

  searchPolyline(path: string | google.maps.LatLng[]): [google.maps.Polyline, WalkT | null] | null {
    const key = PathManager.pathToHash(path)
    return this.polylines[key]
  }

  showPath(path: string | google.maps.LatLng[], select = false, current = false, item: WalkT | null = null) {
    const pair = this.searchPolyline(path)
    let pl = pair?.[0]
    if (typeof path === 'string') {
      path = google.maps.geometry.encoding.decodePath(path)
    }

    if (!pl) {
      pl = new google.maps.Polyline({})
      pl.setPath(path)
      this.addPolyline(pl, item)
    } else if (item) {
      pair[1] = item
      pl.setOptions(this.getPolylineStyle(pl))
    }
    if ((select || current) && path.length > 0) {
      let xmin: number
      let xmax: number
      let ymin: number
      let ymax: number

      if (select) {
        this.set('selection', pl)
      } else if (current) {
        this.set('current', pl)
      }
      for (let i = 0; i < path.length; i += 1) {
        const elem = path[i]
        if (i === 0) {
          xmax = elem.lng()
          xmin = xmax
          ymax = elem.lat()
          ymin = ymax
        } else {
          if (xmin > elem.lng()) xmin = elem.lng()
          if (xmax < elem.lng()) xmax = elem.lng()
          if (ymin > elem.lat()) ymin = elem.lat()
          if (ymax < elem.lat()) ymax = elem.lat()
        }
      }
      const center = { lat: (ymin + ymax) / 2, lng: (xmin + xmax) / 2 }
      this.map.panTo(center)
    }
  }

  addPolyline(pl: google.maps.Polyline, item?: WalkT | null) {
    pl.setOptions(item ? this.styles.normal : this.styles.new)
    pl.setMap(this.map)
    const key = PathManager.pathToHash(pl.getPath().getArray())
    this.polylines[key] = [pl, item]
    google.maps.event.addListener(pl, 'click', (event: google.maps.MapMouseEvent) => {
      this.lastClickLatLng = event.latLng
      if (pl.getEditable()) {
        pl.setEditable(false)
      } else {
        this.set('selection', pl === this.selection ? null : pl)
      }
    })
    const deleteNode = (mev: google.maps.PolyMouseEvent) => {
      if (mev.vertex !== null) {
        pl.getPath().removeAt(mev.vertex)
      } else if (!pl.getEditable()) {
        this.deletePolyline(pl)
      }
    }
    google.maps.event.addListener(pl, 'rightclick', deleteNode)
    const pathCallback = () => {
      this.updateLength()
    }
    google.maps.event.addListener(pl.getPath(), 'insert_at', pathCallback)
    google.maps.event.addListener(pl.getPath(), 'remove_at', pathCallback)
    google.maps.event.addListener(pl.getPath(), 'set_at', pathCallback)
  }

  getPolylineStyle(pl: google.maps.Polyline) {
    const pair = this.searchPolyline(google.maps.geometry.encoding.encodePath(pl.getPath()))
    let style = pair?.[1] ? { ...this.styles.normal } : { ...this.styles.new }
    if (pl === this.current) {
      style = Object.assign(style, this.styles.current)
    }
    if (pl === this.selection) {
      style = Object.assign(style, this.styles.selected)
    }
    return style
  }

  selection_changed() {
    const prevSelection = this.get('prevSelection') as google.maps.Polyline | null
    if (prevSelection) {
      prevSelection.setOptions(this.getPolylineStyle(prevSelection))
      prevSelection.setEditable(false)
    }
    const selection = this.get('selection') as google.maps.Polyline | null
    this.set('prevSelection', selection)

    if (selection) {
      selection.setOptions(this.getPolylineStyle(selection))
    }
    setTimeout(() => {
      this.updateLength()
      selection?.setEditable(true)
    }, 0)
  }

  getSelection() {
    return this.selection
  }

  getEncodedSelection() {
    if (this.selection) {
      return google.maps.geometry.encoding.encodePath(this.selection.getPath())
    }
    return null
  }

  getEncodedCurrent() {
    if (this.current) {
      return google.maps.geometry.encoding.encodePath(this.current.getPath())
    }
    return null
  }

  current_changed() {
    const prevCurrent = this.get('prevCurrent') as google.maps.Polyline | null
    if (prevCurrent) {
      prevCurrent.setOptions(this.getPolylineStyle(prevCurrent))
    }
    const current = this.get('current') as google.maps.Polyline
    this.set('prevCurrent', current)

    if (current) {
      current.setOptions(this.getPolylineStyle(current))
    }
  }

  updateLength() {
    if (this.selection) {
      this.set('length', google.maps.geometry.spherical.computeLength(this.selection.getPath()) / 1000)
    } else {
      this.set('length', 0)
    }
  }

  selectionAsGeoJSON() {
    if (this.selection) {
      return JSON.stringify({
        type: 'LineString',
        coordinates: this.selection.getPath().getArray().map((p) => [p.lng(), p.lat()]),
      })
    }
    return ''
  }

  lastAppendLatLng() {
    if (!this.selection) return null

    const path = this.selection.getPath()
    const length = path.getLength()
    return length > 0 && path.getAt(length - 1)
  }

  getLastClickLatLng() {
    return this.lastClickLatLng
  }

  startDraw() {
    this.draw?.start()
    this.draw?.setMode('linestring')
  }
}
