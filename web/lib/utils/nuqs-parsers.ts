import { createParser } from 'nuqs'
import { decode, encode } from './path-encoder'

export const parseAsPath = createParser({
  parse: (val: string): google.maps.LatLngLiteral[] => {
    return val ? decode(val).map(([lng, lat]) => ({ lat, lng })) : []
  },
  serialize: (
    val: google.maps.LatLngLiteral[] | google.maps.LatLng[] | null,
  ) => {
    const positions = val
      ? val.map((point) => [
          typeof point.lng === 'function' ? point.lng() : point.lng,
          typeof point.lat === 'function' ? point.lat() : point.lat,
        ])
      : []
    return positions ? encode(positions) : null
  },
})

export const parseAsLatLng = createParser({
  parse: (val: string) => {
    const parts = val.split(',')
    if (parts.length !== 2) return null
    const lat = parseFloat(parts[0])
    const lng = parseFloat(parts[1])
    if (isNaN(lat) || isNaN(lng)) return null
    return { lat, lng }
  },
  serialize: (val: google.maps.LatLngLiteral | google.maps.LatLng) => {
    if (!val) return null
    const lat = typeof val.lat === 'function' ? val.lat() : val.lat
    const lng = typeof val.lng === 'function' ? val.lng() : val.lng
    return `${lat},${lng}`
  },
})
