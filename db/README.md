#walklog

walklog is a management tool of walking paths.

## prerequisite
    % git clone --recursive https://github.com/ssugiyama/walklog.git
    % cd walklog

visit http://www.esrij.com/products/gis_data/japanshp/japanshp.html and download zip file japan_verXX.zip into current directory.

edit web/src/config.js

    export default {
        "site_name": "walklog",
        "twitter_site": "@chez_sugi",
        "og_image": "https://walk.asharpminor.com/walklog.png",
        "google_api_key": "",
        "icon_tags": [
            '<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png">',
            '<link rel="icon" type="image/png" href="/icons/favicon-32x32.png" sizes="32x32">',
            '<link rel="icon" type="image/png" href="/icons/favicon-16x16.png" sizes="16x16">',
            '<link rel="manifest" href="/icons/manifest.json">',
            '<link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#5bbad5">',
            '<link rel="shortcut icon" href="/icons/favicon.ico">',
            '<meta name="msapplication-config" content="/icons/browserconfig.xml">',
            '<meta name="theme-color" content="#ffffff">'
        ]
    }

## with docker
    % docker-compose up -d
    % docker-compose run web /var/www/setup.sh

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
    % npm install && npm run build-cli && npm run build-svr
    % cp -a assets/* public
    % PORT=3000 WALKLOG_URL=postgres://user:password@host:5432/walklog npm start

You may access http://localhost:3000 . 

 demo: http://walk.asharpminor.com/
