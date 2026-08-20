import { createParser } from 'nuqs'

export const parseAsPath = createParser({
  parse: (val: string) =>
    val ? google.maps.geometry.encoding.decodePath(val) : [],
  serialize: (val: google.maps.LatLng[]) =>
    val.length > 0 ? google.maps.geometry.encoding.encodePath(val) : '',
})

export const parseAsLatLng = createParser({
  parse: (val: string) => {
    const parts = val.split(',')
    if (parts.length !== 2) return null
    const lat = parseFloat(parts[0])
    const lng = parseFloat(parts[1])
    if (isNaN(lat) || isNaN(lng)) return null
    return new google.maps.LatLng(lat, lng)
  },
  serialize: (val: google.maps.LatLng) => `${val.lat()},${val.lng()}`,
})
