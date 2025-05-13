export type SearchProps = {
    id?: number
    date?: string
    user?: string
    year?: string
    month?: string
    filter?: string
    latitude?: string
    longitude?: string
    radius?: string
    cities?: string
    searchPath?: string
    max_distance?: number
    limit?: string
    offset?: string
    order?: string
    draftUid?: string | null
}

export type SearchResult = {
    count: number
    offset?: number
    rows: any[]
    error?: string
    searching?: boolean
    append?: boolean
    needsReload?: boolean
    nextId?: number | null
    prevId?: number | null
    lastQuery?: string | null
    idTokenExpired?: boolean
}

export type CityParams = {
    jcodes?: string
    latitude?: number
    longitude?: number
}

export type CityResult = {
    jcode: string
    name: string
}

export type UserT {
    uid: string
    displayName: string
    photoURL: string
}