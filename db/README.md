#walklog

walklog is a management tool of walking paths.

## prerequisite
    % git clone --recursive https://github.com/ssugiyama/walklog.git
    % cd walklog

visit http://www.esrij.com/products/gis_data/japanshp/japanshp.html and download zip file japan_verXX.zip into current directory.

## with docker

### data container
    % docker create -v /var/lib/postgresql/data --name walklog-data busybox

### db container
    % docker build -t walklog .
    % docker run -d --volumes-from walklog-data \
        -e POSTGRES_USER=walklog -e POSTGRES_PASSWORD=pass \
        --name walklog-db walkloa-db

### api container
    % cd api
    % docker build -t walklog-api-node .
    % docker run -d -v `pwd`/../web:/usr/src/web -p 3000:3000 \
	    --link walklog:walklog --name walklog-api walklog-api

## without docker

###0. requirement

- postgresql
- postgis 1.5 or higher
- node.js

###1. create database and install postgis functions.

    % createdb walklog -E utf8
    % psql walklog -f $(POSTGIS_DIR)/postgis.sql
    % psql walklog -f $(POSTGIS_DIR)/spatial_ref_sys.sql
    % psql walklog -f schema.sql

###2. setup areas table
    % unzip japan_ver80.zip
    % shp2pgsql -s 4326 -g the_geom -I -W sjis japan_ver80.shp areas > areas.sql
    % psql walklog -f areas.sql

###3. setup and start api server
    % npm install
    % PORT=3000 WALKLOG_URL=postgres://user:password@host:5432/walklog npm start

You may access http://localhost:3000 . 

 demo: http://walk.asharpminor.com/
