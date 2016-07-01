#! /bin/sh
cd /tmp
psql --dbname=walklog -f schema.sql
ZIPFILE=$(ls *.zip | head -1)
SHPFILE=${ZIPFILE%¥.zip}
unzip $ZIPFILE
shp2pgsql -s 4326 -g the_geom -I -W sjis $SHPFILE areas | psql --dbname=walklog
