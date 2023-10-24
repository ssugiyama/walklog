# walklog

walklog is a management tool of walking paths.

## prerequisite

### clone repository

```
% git clone https://github.com/ssugiyama/walklog.git
% cd walklog
```

### import shp files
visit http://www.esrij.com/products/gis_data/japanshp/japanshp.html and download zip file japan_verXX.zip and extract files in some work directory. alternatively you can download data from  National Land Numerical Information (http://nlftp.mlit.go.jp/ksj/jpgis/datalist/KsjTmplt-N03.html) and convert into shp format.


### firebase configuration

Firebase is required for authentication and storage. So you should create firebase project and web app in https://console.firebase.google.com , then enable Google login and create service account for firebase admin. And put firebase config json and service account json in **web/firebase** dir.

### setup envriment variables

```
% cp web/.env.sample web/.env
```

and edit web/.env

```
DB_URL=postgres://postgres@db/walklog
PORT=3000
SITE_NAME=walklog
DESCRIPTION=webapp for walk logging
BASE_URL=http://localhost:3000
IMAGE_PREFIX=uploads/
GOOGLE_API_KEY=
GOOGLE_API_VERSION=
TWITTER_SITE=@chez_sugi
EXTERNAL_LINKS=example=http://example.com;example2=http://example2.com
THEME_PRIMARY=bluegrey
THEME_SECONDARY=orange
DARK_THEME_PRIMARY=blue
DARK_THEME_SECONDARY=amber
FIREBASE_CONFIG=./firebase/firebase-config.json
GOOGLE_APPLICATION_CREDENTIALS=./firebase/service-account.json
ONLY_ADMIN_CAN_CREATE=
USE_FIREBASE_STORAGE=true
MAP_STYLE_CONFIG=
MAP_TYPE_IDS=
＃ NODE_ENV＝production
```

- GOOGLE_API_KEY: needed for google maps. get at https://developers.google.com/maps/documentation/javascript/get-api-key
- GOOGLE_API_VERSION: see https://developers.google.com/maps/documentation/javascript/versions
- EXTERNAL_LINKS: specify external links in main menu such as 'name1=url1;name2=url2
- FIREBASE_CONFIG: firebase config json file path
- GOOGLE_APPLICATION_CREDENTIALS: firebase service account json file path
- ONLY_ADMIN_CAN_CREATE: if true, only admin user can create new walks.
- IMAGE_PREFIX: image store prefix
- USE_FIREBASE_STORAGE: if true, use firebase storage as image store
- MAP_STYLE_CONFIG: url of config json of map styles. default is '/default-map-styles.json'
- MAP_TYPE_IDS: selectable map types. default is 'roadmap,hybrid,satellite,terrain'. you can add 'gsi' to use tha map by GSI(The Geospatial Information Authority of Japan).

### manage admin users

```
% cd web
% ./set-admin.js add firebase-uid
```

or

```
% cd web
% ./set-admin.js rm firebase-uid
```

## with docker

### 1. setup area table

*work_dir* is the directory which you put shp files in.

    % docker-compose run -v *work_dir*:/tmp --rm db manage-areas.sh -h db *shp_file*

### 2. set up and start servers

```
% docker-compose run --rm web /var/www/setup.sh
% docker-compose up -d
```

## without docker

### 0. requirement

- postgresql with postgis 2.4 or higher
- PosrGIS enabled database
- node.js
- yarn

### 1. setup areas table
    % cd *work_dir*
    % $(project_root)/db/manage-areas.sh *shp_file*

### 2. set up and start api server
    % cd ../web
    % export NODE_ENV=xxx
    % yarn install && yarn run build-svr
    % DB_URL=xxx ./setup.sh
    % yarn run start-with-dotenv

You may access http://localhost:3000 .

 demo: http://walk.asharpminor.com/
