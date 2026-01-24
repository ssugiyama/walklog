export const idToShowUrl = (id: string | number, params: URLSearchParams = null) => `/show/${id}${params ? `?${params.toString()}` : ''}`
export const idToEditUrl = (id: string | number, params: URLSearchParams = null) => `/edit/${id}${params ? `?${params.toString()}` : ''}`
