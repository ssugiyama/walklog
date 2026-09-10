export const idToShowUrl = (id: string | number, params?: URLSearchParams) =>
  `/show/${id}${params ? `?${params.toString()}` : ''}`
export const idToEditUrl = (id: string | number, params?: URLSearchParams) =>
  `/edit/${id}${params ? `?${params.toString()}` : ''}`
