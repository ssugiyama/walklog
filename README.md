# walklog

walklog is a management tool of walking paths.

## prerequisite
    % git clone https://github.com/ssugiyama/walklog.git
    % cd walklog

visit http://www.esrij.com/products/gis_data/japanshp/japanshp.html and download zip file japan_verXX.zip into db directory.

    % cp web/.env.sample web/,env

and edit web/.env 

```
SESSION_SECRET='keyboard cat'
SESSION_MAX_AGE=604800000
TWITTER_CONSUMER_KEY=
TWITTER_CONSUMER_SECRET=
TWITTER_ALLOWED_USERS='user1,user2'
DB_URL='postgres://postgres@db/postgres'
PORT=3000
SITE_NAME='walklog'
DESCRIPTION='webapp for walk logging',
BASE_URL='http://localhost:3000'
GOOGLE_API_KEY=
TWITTER_SITE='@chez_sugi'
EXTERNAL_LINKS='example=http://example.com;example2=http://example2.com'
THEME_PRIMARY='bluegrey'
THEME_SECONDARY='orange'
THEME_TYPE='light'
```

- GOOGLE_API_KEY: needed for google maps. get at https://developers.google.com/maps/documentation/javascript/get-api-key
- TWITTER_CONSUMER_KEY and TWITTER_CONSUMER_SECRET: needed for twitter authentication. get at https://apps.twtter.com
- TWITTER_ALLOWED_USERS: specify screennames concatenated with ',' if restrict the users who can login
- EXTERNAL_LINKS: specify external links in main menu such as 'name1=url1;name2=url2
'
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
    % sh -c "$(cat .env| tr '\n' ' ') yarn start"

You may access http://localhost:3000 . 

 demo: http://walk.asharpminor.com/
