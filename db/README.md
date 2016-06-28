#walklog

walklog is a management tool of walking paths.

## prerequisite
    % git clone --recursive https://github.com/ssugiyama/walklog.git
    % cd walklog

visit http://www.esrij.com/products/gis_data/japanshp/japanshp.html and download zip file japan_verXX.zip into current directory.

### db container
	% docker volume create walklog-data
    % docker build -t walklog-db .
    % docker run -d --volumes walklog-data:/var/lib/postgresql/data \
        -e POSTGRES_USER=walklog -e POSTGRES_PASSWORD=pass \
        --name walklog-db walkloa-db

### web container
    % docker build -t walklog-web web
	% docker create -v /var/www/public --name walklog-web walklog-web

### api container
    % docker build -t walklog-api api
    % docker run -d -p 3000:3000 --volumes-from walklog-web\
	    --link walklog-db:walklog --name walklog-api walklog-api

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
    % cd web
    % npm install && npm run build
	% cd ../api
	% ln -s ../web/public
    % PORT=3000 WALKLOG_URL=postgres://user:password@host:5432/walklog npm start

You may access http://localhost:3000 . 

 demo: http://walk.asharpminor.com/
