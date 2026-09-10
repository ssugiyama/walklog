'use client'
import { createContext, Dispatch, useContext, useState } from 'react'
import type PathManager from '@/lib/utils/path-manager'
import { WalkT } from '@/types'
import PolygonManager from './polygon-manager'

type MapState = {
  map?: google.maps.Map
  pathManager?: PathManager
  polygonManager?: PolygonManager
  elevationInfoWindow?: google.maps.InfoWindow
  pathInfoWindow?: google.maps.InfoWindow
  distanceWidget?: google.maps.Circle
  marker?: google.maps.marker.AdvancedMarkerElement
  addPoint: (lat: number, lng: number, append: boolean) => void
  uploadPath: () => void
  downloadPath: () => void
  clearPaths: (retainTemporary: boolean, retainPesistent: boolean) => void
  addPaths: (items: WalkT[]) => void
  deleteSelectedPath: () => void
}

const initialState: MapState = {
  map: undefined,
  pathManager: undefined,
  elevationInfoWindow: undefined,
  polygonManager: undefined,
  pathInfoWindow: undefined,
  distanceWidget: undefined,
  marker: undefined,
  addPoint: () => {},
  uploadPath: () => {},
  downloadPath: () => {},
  clearPaths: (retainTemporary: boolean, retainPesistent: boolean) => {},
  addPaths: () => {},
  deleteSelectedPath: () => {},
}

const MapContext = createContext({})

export function MapContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [state, setState] = useState<MapState>(initialState)
  return (
    <MapContext.Provider value={[state, setState]}>
      {children}
    </MapContext.Provider>
  )
}

export function useMapContext() {
  return useContext<[MapState, Dispatch<MapState>]>(MapContext)
}

export default MapContext
