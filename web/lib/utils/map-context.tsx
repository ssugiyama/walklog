'use client'
import { useState, useContext, Dispatch } from "react"
import { createContext } from 'react'
import { Path } from "typescript"
import type PathManager from "@/lib/utils/path-manager"
import PolygonManager from "./polygon-manager"
type MapState = {
  map: google.maps.Map | null
  pathManager: PathManager | null
  polygonManager: PolygonManager | null
  elevationInfoWindow: google.maps.InfoWindow | null
  pathInfoWindow: google.maps.InfoWindow | null
  distanceWidget: google.maps.Circle | null
  marker: google.maps.marker.AdvancedMarkerElement | null
  addPoint: (lat: number, lng: number, append: boolean) => void
  uploadPath: () => void
  downloadPath: () => void,
  clearPaths: (retainTemporaryAndSelection: boolean) => void
  addPaths: (items: Path[]) => void
  deleteSelectedPath: () => void
}

const initialState: MapState = {
  map: null,
  pathManager: null,
  elevationInfoWindow: null,
  polygonManager: null,
  pathInfoWindow: null,
  distanceWidget: null,
  marker: null,
  addPoint: () => { },
  uploadPath: () => { },
  downloadPath: () => { },
  clearPaths: () => { },
  addPaths: () => { },
  deleteSelectedPath: () => { },
}

const MapContext = createContext({})

export function MapContextProvider({ children }: { children: React.ReactNode }) {
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
