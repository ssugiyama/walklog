-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations

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
