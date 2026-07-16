import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { PGlite } from '@electric-sql/pglite'
import { postgis } from '@electric-sql/pglite-postgis'
import { relations } from './relations'

// Mirrors lib/drizzle/schema.ts. drizzle-kit's programmatic push/migrate API
// is not yet stable for the pglite driver on this drizzle-kit prerelease, so
// the schema is created directly instead of generating it from a migration.
const CREATE_SCHEMA_SQL = `
CREATE TABLE "areas" (
  "gid" serial PRIMARY KEY NOT NULL,
  "jcode" varchar(254),
  "ken" varchar(254),
  "sicho" varchar(254),
  "gun" varchar(20),
  "seirei" varchar(20),
  "sikuchoson" varchar(20),
  "city_eng" varchar(254),
  "p_num" double precision,
  "h_num" double precision,
  "the_geom" geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX "areas_the_geom_idx" ON "areas" USING gist ("the_geom");

CREATE TABLE "walks" (
  "id" serial PRIMARY KEY NOT NULL,
  "date" date NOT NULL,
  "title" text NOT NULL,
  "comment" text,
  "image" text,
  "length" double precision,
  "draft" boolean DEFAULT false NOT NULL,
  "path" geometry(LineString, 4326) NOT NULL,
  "uid" varchar(255),
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL
);
CREATE INDEX "walks_date" ON "walks" USING btree ("date");
CREATE INDEX "walks_draft" ON "walks" USING btree ("draft");
CREATE INDEX "walks_path" ON "walks" USING gist ("path");
`

export async function createTestDb() {
  const client = new PGlite({ extensions: { postgis } })
  await client.exec('CREATE EXTENSION IF NOT EXISTS postgis;')
  await client.exec(CREATE_SCHEMA_SQL)
  const db = drizzlePglite({ client, relations })
  return { db, client }
}
