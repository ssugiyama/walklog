import { Position } from 'geojson'
import wkx from 'wkx'
import { decode, encode } from './path-encoder'
export const EARTH_RADIUS = 6370986
export const SRID = process.env.SRID ?? 4326
export const SRID_FOR_SIMILAR_SEARCH = Number(
  process.env.SRID_FOR_SIMILAR_SEARCH,
)

type Extent = {
  xmax?: number
  xmin?: number
  ymax?: number
  ymin?: number
}

export const getPoint = (x: number, y: number): string => {
  return `SRID=${SRID};POINT(${x} ${y})`
}

export const decodePath = (path: string): string => {
  const json = {
    type: 'LineString',
    coordinates: decode(path),
    crs: { type: 'name', properties: { name: `EPSG:${SRID}` } },
  }
  return wkx.Geometry.parseGeoJSON(json).toEwkt()
}

export const getPathExtent = (path: string): Extent => {
  const points = decode(path)
  return points.reduce((pv: Extent, cv) => {
    if (pv.xmax === undefined || pv.xmax < cv[0]) pv.xmax = cv[0]
    if (pv.xmin === undefined || pv.xmin > cv[0]) pv.xmin = cv[0]
    if (pv.ymax === undefined || pv.ymax < cv[1]) pv.ymax = cv[1]
    if (pv.ymin === undefined || pv.ymin > cv[1]) pv.ymin = cv[1]
    return pv
  }, {})
}

export const getStartPoint = (path: string): [number, number] => {
  const points = decode(path)
  return points[0]
}

export const getEndPoint = (path: string): [number, number] => {
  const points = decode(path)
  return points[points.length - 1]
}

export const encodedPath = (path: Position[]): string => {
  return encode(path)
}

export const encodeMultipolygon = (geom: Position[][][]): string => {
  return geom.map((polygons) => encode(polygons[0])).join(' ')
}

export const calcPathLength = (path: Position[]): number => {
  let length = 0
  for (let i = 1; i < path.length; i += 1) {
    const [x1, y1] = path[i - 1]
    const [x2, y2] = path[i]
    const dx = ((x2 - x1) * Math.PI) / 180
    const dy = ((y2 - y1) * Math.PI) / 180

    const a =
      Math.sin(dy / 2) * Math.sin(dy / 2) +
      Math.cos((y1 * Math.PI) / 180) *
        Math.cos((y2 * Math.PI) / 180) *
        Math.sin(dx / 2) *
        Math.sin(dx / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = EARTH_RADIUS * c
    length += distance
  }
  return length
}
