#walkdb

walkdb is a management tool of walking paths.

##0. prerequisite
-  postgresql
-  postgis 1.5 or higher

Postgresql has to be accessible from docker containers. so, configure network settings.

##1. create database and install postgis functions.

    % createdb walkdb -E utf8
    % psql walkdb -f postgis.sql
    % psql walkdb -f spatial_ref_sys.sql
    % psql walkdb -f schema.sql

##2. setup areas table
visit http://www.esrij.com/products/gis_data/japanshp/japanshp.html and download zip file japan_ver80.zip. then extract japan_ver80.shp to a working directory.
 
    % shp2pgsql -s 4326 -g the_geom -I -W sjis japan_ver80.shp areas > areas.sql
    % psql walkdb -f areas.sql

##3. build and run docker container

    % docker build -t walkdb .
    % docker run -d -p app_port:3000 -e NODE_ENV=production -e DB_URL=postgres://dbuser:dbpass@dbhost:5432/walkdb --name container_name walkdb

You may access http://localhost:*app_port* . 

 demo: http://walk.asharpminor.com/
