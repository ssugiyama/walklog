import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  customType,
  date,
  doublePrecision,
  index,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'
import { LineString, MultiPolygon, Position } from 'geojson'
import { Geometry } from 'wkx' // For WKB to GeoJSON conversion

export const coordinatesToWKT = (coordinates: Position[]): string => {
  const wkt = coordinates.map(([lng, lat]) => `${lng} ${lat}`).join(', ')
  return `SRID=4326;LINESTRING(${wkt})`
}

const linestring = customType<{
  data: Position[]
  driverData: string
}>({
  dataType() {
    return 'geometry(LineString, 4326)' // Define the PostGIS geometry type with SRID
  },
  toDriver(coordinates: Position[]): string {
    return coordinatesToWKT(coordinates)
  },
  fromDriver(data: string): Position[] {
    // Convert WKB (Well-Known Binary) from DB back to GeoJSON coordinates for application
    const geoJson = Geometry.parse(
      Buffer.from(data, 'hex'),
    ).toGeoJSON() as LineString
    return geoJson.coordinates
  },
})

const multipolygon = customType<{
  data: Position[][][]
  driverData: string
}>({
  dataType() {
    return 'geometry(MultiPolygon, 4326)' // Define the PostGIS geometry type with SRID
  },
  toDriver(coordinates: Position[][][]): string {
    // Convert array coordinates to GeoJSON string for database insertion
    return JSON.stringify({
      type: 'MultiPolygon',
      coordinates,
    })
  },
  fromDriver(data: string): Position[][][] {
    // Convert WKB (Well-Known Binary) from DB back to GeoJSON coordinates for application
    const geoJson = Geometry.parse(
      Buffer.from(data, 'hex'),
    ).toGeoJSON() as MultiPolygon
    return geoJson.coordinates
  },
})

export const areas = pgTable(
  'areas',
  {
    gid: serial().primaryKey().notNull(),
    jcode: varchar({ length: 254 }),
    ken: varchar({ length: 254 }),
    sicho: varchar({ length: 254 }),
    gun: varchar({ length: 20 }),
    seirei: varchar({ length: 20 }),
    sikuchoson: varchar({ length: 20 }),
    cityEng: varchar('city_eng', { length: 254 }),
    pNum: doublePrecision('p_num'),
    hNum: doublePrecision('h_num'),
    theGeom: multipolygon('the_geom').notNull(),
  },
  (table) => [
    index('areas_the_geom_idx').using(
      'gist',
      table.theGeom.asc().nullsLast().op('gist_geometry_ops_2d'),
    ),
  ],
)

export const users = pgTable('users', {
  uid: varchar({ length: 255 }).primaryKey(),
  email: varchar({ length: 255 }),
  displayName: varchar('display_name', { length: 255 }),
  photoURL: varchar('photo_url', { length: 512 }),
  status: varchar({ length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  })
    .defaultNow()
    .notNull(),
})

export const walks = pgTable(
  'walks',
  {
    id: serial().primaryKey().notNull(),
    date: date().notNull(),
    title: text().notNull(),
    comment: text(),
    image: text(),
    length: doublePrecision(),
    draft: boolean().default(false).notNull(),
    path: linestring('path').notNull(),
    uid: varchar({ length: 255 }),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
  },
  (table) => [
    index('walks_date').using(
      'btree',
      table.date.asc().nullsLast().op('date_ops'),
    ),
    index('walks_draft').using(
      'btree',
      table.draft.asc().nullsLast().op('bool_ops'),
    ),
    index('walks_path').using(
      'gist',
      table.path.asc().nullsLast().op('gist_geometry_ops_2d'),
    ),
    check('enforce_dims_path', sql`st_ndims(path) = 2`),
    check(
      'enforce_geotype_path',
      sql`(geometrytype(path) = 'LINESTRING'::text) OR (path IS NULL)`,
    ),
    check('enforce_srid_path', sql`st_srid(path) = 4326`),
  ],
)
