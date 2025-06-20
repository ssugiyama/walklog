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
}

export type SearchState ={
  serial?: number
  rows: WalkT[]
  count: number
  offset?: number
  idTokenExpired?: boolean
  index?: number
  append?: boolean
  current?: WalkT | null
}

export type GetItemState = {
  idTokenExpired?: boolean
  current?: WalkT | null
  serial?: number
}

export type UpdateItemState = {
  id?: number
  error?: string | null
  idTokenExpired?: boolean
  serial?: number
}

export type DeleteItemState = {
  deleted?: boolean
  idTokenExpired?: boolean
  serial?: number
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
}

export type DataT = SearchState & GetItemState &{
  isPending?: boolean
  count?: number
  offset?: number
  showDistance?: false,
  index?: number,
  nextId?: number | null
  prevId?: number | null
  params?: string
  forceReload?: number
}