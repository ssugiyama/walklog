# walklog

walklog is a management tool of walking paths.

## prerequisite
    % git clone https://github.com/ssugiyama/walklog.git
    % cd walklog

visit http://www.esrij.com/products/gis_data/japanshp/japanshp.html and download zip file japan_verXX.zip into db directory.

    % cp web/config.js.sample web/config.js

and edit web/config.js 

    const config = {
        session_secret: 'keyboard cat',
        session_max_age: 7*24*60*60*1000,
        twitter_consumer_key: '',
        twitter_consumer_secret: '',
        twitter_allowed_users: null,
        db_url: 'postgres://postgres@db/postgres',
        port: 3000,
        shared: {
            site_name: 'walklog',
            site_description: 'webapp for walk logging',
            base_url: 'http://localhost:3000',
            google_api_key: '',
            twitter_site: '@chez_sugi',
            external_links : [{
                href : 'http://example.com',
                name : 'example'
            }],
            theme_primary : 'bluegrey',
            theme_secondary : 'orange',
            theme_type : 'light',
        }
    };

    module.exports = config;

- `google_api_key` : needed for google maps. get at https://developers.google.com/maps/documentation/javascript/get-api-key
- `twitter_consumer_key` and `twitter_consumer_secret`: needed for twitter authentication. get at https://apps.twtter.com
- `'twitter_allowed_users` : specify array of screennames if restrict the users who can login

## with docker
    % mkdir data public
    % docker-compose up -d
    % docker-compose run --rm web /var/www/setup.sh

## without docker 

### 0. requirement

- postgresql
- postgis 2.4 or higher
- node.js
- yarn 

### 1. create database and install postgis functions.
    % cd db
    % createdb walklog -E utf8
    % psql walklog -f $(POSTGIS_DIR)/postgis.sql
    % psql walklog -f $(POSTGIS_DIR)/spatial_ref_sys.sql
    % psql walklog -f schema.sql

### 2. setup areas table
    % unzip japan_ver81.zip
    % shp2pgsql -s 4326 -g the_geom -I -W sjis japan_ver81.shp areas > areas.sql
    % psql walklog -f areas.sql

### 3. setup and start api server
    % cd ../web
    % yarn install && yarn run build-cli && yarn run build-svr
    % cp -a assets/* public
    % yarn start

You may access http://localhost:3000 . 

 demo: http://walk.asharpminor.com/
