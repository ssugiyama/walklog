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
  // TS keys follow better-auth's default field names; the physical column
  // names are unchanged so existing data and bin/manage-users.js keep working.
  id: varchar('uid', { length: 255 }).primaryKey(),
  email: varchar({ length: 255 }),
  name: varchar('display_name', { length: 255 }),
  image: varchar('photo_url', { length: 512 }),
  emailVerified: boolean('email_verified').notNull().default(false),
  active: boolean().notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const session = pgTable(
  'session',
  {
    id: text().primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_user_id_idx').on(table.userId)],
)

export const account = pgTable(
  'account',
  {
    id: text().primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
    }),
    scope: text(),
    password: text(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('account_user_id_idx').on(table.userId)],
)

export const verification = pgTable(
  'verification',
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
)

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
