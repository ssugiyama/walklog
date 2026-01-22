export type SearchProps = {
  date?: string
  user?: string
  year?: string
  month?: string
  filter?: string
  latitude?: string
  longitude?: string
  center?: string
  radius?: string
  cities?: string
  path?: string
  max_distance?: number
  limit?: number
  offset?: number
  order?: string
  draftUid?: string | null
}

export type WalkT = {
  id: number
  uid: string
  date: string
  title: string
  comment: string
  distance?: number
  length?: number
  path?: string
  image?: string
  draft?: boolean
  stale?: boolean
}

export type BaseState = {
  serial?: number
  idTokenExpired?: boolean
  error?: string | null
}
export type SearchState = BaseState & {
  rows: WalkT[]
  count: number
  offset?: number
  index?: number
  append?: boolean
}

export type GetItemState = BaseState & {
  current?: WalkT | null
}

export type UpdateItemState = BaseState & {
  id?: number
}

export type DeleteItemState = BaseState & {
  deleted?: boolean
}

export type CityParams = {
  jcodes?: string[]
  latitude?: number
  longitude?: number
}

export type CityT = {
  jcode: string
  theGeom: string
}

export type UserT = {
  uid: string
  displayName: string
  photoURL: string
  admin?: boolean
}

export type DataT = Omit<SearchState & GetItemState, 'serial'> &{
  isPending?: boolean
  count?: number
  offset?: number
  showDistance?: false,
  index?: number,
  nextId?: number | null
  prevId?: number | null
  params?: string
}

export type ShapeStyles = {
  polylines: {
    normal: google.maps.PolylineOptions
    current: google.maps.PolylineOptions
    selected: google.maps.PolylineOptions
    new: google.maps.PolylineOptions
  }
  polygons: google.maps.PolygonOptions
  circle: google.maps.CircleOptions
  marker: google.maps.marker.AdvancedMarkerElementOptions
}

export type ConfigT = {
  googleApiKey: string
  googleApiVersion: string
  openUserMode: boolean
  appVersion: string
  defaultCenter: string
  defaultZoom: number
  defaultRadius: number
  mapTypeIds: string
  mapId: string
  firebaseConfig: object
  shapeStyles: ShapeStyles
  theme: object
}