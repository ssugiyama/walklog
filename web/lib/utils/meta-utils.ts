import type { WalkT } from '@/types'

export const idToShowUrl = (id: string | number, params?: URLSearchParams) =>
  `/show/${id}${params ? `?${params.toString()}` : ''}`
export const idToEditUrl = (id: string | number, params?: URLSearchParams) =>
  `/edit/${id}${params ? `?${params.toString()}` : ''}`

export const walkTitle = (item: WalkT) =>
  `${item.date} : ${item.title} (${(item.length ?? 0).toFixed(1)} km)`

export const walkDescription = (item: WalkT) =>
  item.comment
    ? `${item.comment.replace(/[\n\r]/g, '').substring(0, 140)}...`
    : undefined
