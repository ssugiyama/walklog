ALTER TABLE "areas" DROP COLUMN "shape_leng";--> statement-breakpoint
ALTER TABLE "areas" DROP COLUMN "shape_area";--> statement-breakpoint
ALTER TABLE "areas" ALTER COLUMN "the_geom" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "walks" ALTER COLUMN "path" SET DATA TYPE geometry(LineString,4326) USING "path"::geometry(LineString,4326);--> statement-breakpoint
ALTER TABLE "walks" ALTER COLUMN "path" SET NOT NULL;