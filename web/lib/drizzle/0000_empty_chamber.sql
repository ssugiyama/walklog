-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "spatial_ref_sys" (
	"srid" integer NOT NULL,
	"auth_name" varchar(256),
	"auth_srid" integer,
	"srtext" varchar(2048),
	"proj4text" varchar(2048),
	CONSTRAINT "spatial_ref_sys_srid_check" CHECK ((srid > 0) AND (srid <= 998999))
);
--> statement-breakpoint
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
	"shape_leng" numeric,
	"shape_area" numeric,
	"the_geom" geometry(MultiPolygon,4326)
);
--> statement-breakpoint
CREATE TABLE "SequelizeMeta" (
	"name" varchar(255) PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "walks_bak" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text,
	"date" date NOT NULL,
	"title" text NOT NULL,
	"comment" text,
	"image" text,
	"length" double precision,
	"path" geometry,
	"created_at" timestamp,
	"updated_at" timestamp,
	CONSTRAINT "enforce_dims_path" CHECK (st_ndims(path) = 2),
	CONSTRAINT "enforce_geotype_path" CHECK ((geometrytype(path) = 'LINESTRING'::text) OR (path IS NULL)),
	CONSTRAINT "enforce_srid_path" CHECK (st_srid(path) = 4326)
);
--> statement-breakpoint
CREATE TABLE "walks" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"title" text NOT NULL,
	"comment" text,
	"image" text,
	"length" double precision,
	"draft" boolean DEFAULT false NOT NULL,
	"path" geometry,
	"uid" varchar(255),
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "enforce_dims_path" CHECK (st_ndims(path) = 2),
	CONSTRAINT "enforce_geotype_path" CHECK ((geometrytype(path) = 'LINESTRING'::text) OR (path IS NULL)),
	CONSTRAINT "enforce_srid_path" CHECK (st_srid(path) = 4326)
);
--> statement-breakpoint
CREATE INDEX "areas_the_geom_idx" ON "areas" USING gist ("the_geom" gist_geometry_ops_2d);--> statement-breakpoint
CREATE INDEX "walks_date" ON "walks" USING btree ("date" date_ops);--> statement-breakpoint
CREATE INDEX "walks_draft" ON "walks" USING btree ("draft" bool_ops);--> statement-breakpoint
CREATE INDEX "walks_path" ON "walks" USING gist ("path" gist_geometry_ops_2d);--> statement-breakpoint
CREATE VIEW "public"."geography_columns" AS (SELECT current_database() AS f_table_catalog, n.nspname AS f_table_schema, c.relname AS f_table_name, a.attname AS f_geography_column, postgis_typmod_dims(a.atttypmod) AS coord_dimension, postgis_typmod_srid(a.atttypmod) AS srid, postgis_typmod_type(a.atttypmod) AS type FROM pg_class c, pg_attribute a, pg_type t, pg_namespace n WHERE t.typname = 'geography'::name AND a.attisdropped = false AND a.atttypid = t.oid AND a.attrelid = c.oid AND c.relnamespace = n.oid AND (c.relkind = ANY (ARRAY['r'::"char", 'v'::"char", 'm'::"char", 'f'::"char", 'p'::"char"])) AND NOT pg_is_other_temp_schema(c.relnamespace) AND has_table_privilege(c.oid, 'SELECT'::text));--> statement-breakpoint
CREATE VIEW "public"."geometry_columns" AS (SELECT current_database()::character varying(256) AS f_table_catalog, n.nspname AS f_table_schema, c.relname AS f_table_name, a.attname AS f_geometry_column, COALESCE(postgis_typmod_dims(a.atttypmod), sn.ndims, 2) AS coord_dimension, COALESCE(NULLIF(postgis_typmod_srid(a.atttypmod), 0), sr.srid, 0) AS srid, replace(replace(COALESCE(NULLIF(upper(postgis_typmod_type(a.atttypmod)), 'GEOMETRY'::text), st.type, 'GEOMETRY'::text), 'ZM'::text, ''::text), 'Z'::text, ''::text)::character varying(30) AS type FROM pg_class c JOIN pg_attribute a ON a.attrelid = c.oid AND NOT a.attisdropped JOIN pg_namespace n ON c.relnamespace = n.oid JOIN pg_type t ON a.atttypid = t.oid LEFT JOIN ( SELECT s.connamespace, s.conrelid, s.conkey, replace(split_part(s.consrc, ''''::text, 2), ')'::text, ''::text) AS type FROM ( SELECT pg_constraint.connamespace, pg_constraint.conrelid, pg_constraint.conkey, pg_get_constraintdef(pg_constraint.oid) AS consrc FROM pg_constraint) s WHERE s.consrc ~~* '%geometrytype(% = %'::text) st ON st.connamespace = n.oid AND st.conrelid = c.oid AND (a.attnum = ANY (st.conkey)) LEFT JOIN ( SELECT s.connamespace, s.conrelid, s.conkey, replace(split_part(s.consrc, ' = '::text, 2), ')'::text, ''::text)::integer AS ndims FROM ( SELECT pg_constraint.connamespace, pg_constraint.conrelid, pg_constraint.conkey, pg_get_constraintdef(pg_constraint.oid) AS consrc FROM pg_constraint) s WHERE s.consrc ~~* '%ndims(% = %'::text) sn ON sn.connamespace = n.oid AND sn.conrelid = c.oid AND (a.attnum = ANY (sn.conkey)) LEFT JOIN ( SELECT s.connamespace, s.conrelid, s.conkey, replace(replace(split_part(s.consrc, ' = '::text, 2), ')'::text, ''::text), '('::text, ''::text)::integer AS srid FROM ( SELECT pg_constraint.connamespace, pg_constraint.conrelid, pg_constraint.conkey, pg_get_constraintdef(pg_constraint.oid) AS consrc FROM pg_constraint) s WHERE s.consrc ~~* '%srid(% = %'::text) sr ON sr.connamespace = n.oid AND sr.conrelid = c.oid AND (a.attnum = ANY (sr.conkey)) WHERE (c.relkind = ANY (ARRAY['r'::"char", 'v'::"char", 'm'::"char", 'f'::"char", 'p'::"char"])) AND NOT c.relname = 'raster_columns'::name AND t.typname = 'geometry'::name AND NOT pg_is_other_temp_schema(c.relnamespace) AND has_table_privilege(c.oid, 'SELECT'::text));
*/