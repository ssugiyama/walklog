# walklog

walklog is a management tool of walking paths.

## prerequisite
    % git clone https://github.com/ssugiyama/walklog.git
    % cd walklog

visit http://www.esrij.com/products/gis_data/japanshp/japanshp.html and download zip file japan_verXX.zip into db directory.

    % cp web/src/config.js.sample web/src/config.js

and edit web/src/config.js.

    export default {
        'site_name': 'walklog',
        'base_url': 'http://localhost:3000',
        'twitter_site': '@chez_sugi',
        'google_api_key': '',
        'session_secret': 'keyboard cat',
        'session_max_age': 7*24*60*60*1000,
        'twitter_consumer_key': '',
        'twitter_consumer_secret': '',
        'twitter_allowed_users': null,
        'external_links': [],
    };

- `google_api_key` : needed for google maps. get at https://developers.google.com/maps/documentation/javascript/get-api-key
- `twitter_consumer_key` and `twitter_consumer_secret`: needed for twitter authentication. get at https://apps.twtter.com
- `'twitter_allowed_users` : specify array of screennames if restrict the users who can login

## with docker
    % mkdir data public
    % docker-compose up -d
    % docker-compose run --rm web /var/www/setup.sh

## without docker 

###0. requirement

- postgresql
- postgis 1.5 or higher
- node.js

###1. create database and install postgis functions.
    % cd db
    % createdb walklog -E utf8
    % psql walklog -f $(POSTGIS_DIR)/postgis.sql
    % psql walklog -f $(POSTGIS_DIR)/spatial_ref_sys.sql
    % psql walklog -f schema.sql

###2. setup areas table
    % unzip japan_ver81.zip
    % shp2pgsql -s 4326 -g the_geom -I -W sjis japan_ver81.shp areas > areas.sql
    % psql walklog -f areas.sql

###3. setup and start api server
    % cd ../web
    % npm install && npm run build-cli && npm run build-svr
    % cp -a assets/* public
    % PORT=3000 WALKLOG_URL=postgres://user:password@host:5432/walklog npm start

You may access http://localhost:3000 . 

 demo: http://walk.asharpminor.com/
