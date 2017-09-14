CREATE TABLE users (
    id serial NOT NULL PRIMARY KEY,
    strategy varchar(30) NOT NULL,
    passport_id int NOT NULL,
    username text NOT NULL,
    photo text,
    profile text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,    
    CONSTRAINT strategy_passport_id_key UNIQUE (strategy, passport_id)
);

CREATE TABLE walks (
    id serial NOT NULL PRIMARY KEY,
    user_id int references users(id),
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

