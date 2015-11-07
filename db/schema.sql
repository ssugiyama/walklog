CREATE TABLE walks (
    id serial NOT NULL,
    date date NOT NULL,
    title text NOT NULL,
    comment text NULL,
    length double precision,
    path geometry,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    CONSTRAINT enforce_dims_path CHECK ((st_ndims(path) = 2)),
    CONSTRAINT enforce_geotype_path CHECK (((geometrytype(path) = 'LINESTRING'::text) OR (path IS NULL))),
    CONSTRAINT enforce_srid_path CHECK ((st_srid(path) = 4326))
);
