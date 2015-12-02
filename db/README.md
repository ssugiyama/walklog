#walkdb

walkdb is a management tool of walking paths.

## prerequisite
    % git clone --recursive https://github.com/ssugiyama/walkdb.git
    % cd walkdb

visit http://www.esrij.com/products/gis_data/japanshp/japanshp.html and download zip file japan_verXX.zip into current directory.

## with docker

### data container
    % docker create -v /var/lib/postgresql/data --name walkdb-data busybox

### db container
    % docker build -t walkdb .
    % docker run -d --volumes-from walkdb-data \
        -e POSTGRES_USER=walkdb -e POSTGRES_PASSWORD=pass \
        --name walkdb walkdb

### api container
    % cd api
    % docker build -t walkdb-api-node .
	% docker run -d -v `pwd`/../web:/usr/src/web -p 3000:3000 \
	    --link walkdb:walkdb --name walkdb-api-node walkdb-api-node

## without docker

###0. requirement

- postgresql
- postgis 1.5 or higher
- node.js

###1. create database and install postgis functions.

    % createdb walkdb -E utf8
    % psql walkdb -f $(POSTGIS_DIR)/postgis.sql
    % psql walkdb -f $(POSTGIS_DIR)/spatial_ref_sys.sql
    % psql walkdb -f schema.sql

###2. setup areas table
    % unzip japan_ver80.zip
    % shp2pgsql -s 4326 -g the_geom -I -W sjis japan_ver80.shp areas > areas.sql
    % psql walkdb -f areas.sql

###3. setup and start api server
    % npm install
    % PORT=3000 WALKDB_URL=postgres://user:password@host:5432/walkdb npm start

You may access http://localhost:3000 . 

 demo: http://walk.asharpminor.com/
