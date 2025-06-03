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

Copy `.env` to `.env.local` and edit it

```
SITE_NAME=Walklog
SITE_DESCRIPTION=webapp for managing your walking logs
IMAGE_PREFIX=uploads
OPEN_USER_MODE=
DRAWING_STYLES_JSON=path-to-drawing-styles.json
SRID=4326
SRID_FOR_SIMILAR_SEARCH=32662
FIREBASE_CONFIG=path-to-firebase-config.json
DB_URL=postgres://dbuser:password@host/dbname
NEXT_PUBLIC_GOOGLE_API_KEY=
FIREBASE_STORAGE=on
NEXT_PUBLIC_MAP_TYPE_IDS=roadmap,hybrid,terrain,gsi
NEXT_PUBLIC_DEFAULT_CENTER=lat,lng
NEXT_PUBLIC_MAP_ID=
GOOGLE_APPLICATION_CREDENTIALS=path-to-google-credentials.json
```
- SITE_NAME: site name
- SITE_DESCRIPTION: site description
- DB_URL: url for connecting from web to db
- IMAGE_PREFIX: image store prefix
- OPEN_USER_MODE: everybody can manage walks unless blank
- FIREBASE_CONFIG: firebase config json file path
- GOOGLE_APPLICATION_CREDENTIALS: firebase admin service account json file path
- USE_FIREBASE_STORAGE: if true, use firebase storage as image store
- DRAWING_STYLES_JSON: url of config json of drawing styles. default is '/default-drawing-styles.json'
- NEXT_PUBLIC_GOOGLE_API_KEY: needed for google maps. get at https://developers.google.com/maps/documentation/javascript/get-api-key
- NEXT_PUBLIC_GOOGLE_API_VERSION: see https://developers.google.com/maps/documentation/javascript/versions
- NEXT_PUBLIC_MAP_TYPE_IDS: selectable map types. default is 'roadmap,hybrid,satellite,terrain'. you can add 'gsi' to use tha map by GSI(The Geospatial Information Authority of Japan).
- NEXT_PUBLIC_MAP_ID: A map ID is a unique identifier that represents a single instance of a Google Map. You can create map IDs and update a style associated with a map ID at any time in the Cloud Console.
- NEXT_PUBLIC_DEFAULT_CENTER: default map center

### manage admin users

in `next` folder

```
% GOOGLE_APPLICATION_CREDENTIALS=path-to-google-credentials.json \
./bin/set-admin.js add firebase-uid
```

or

```
% GOOGLE_APPLICATION_CREDENTIALS=path-to-google-credentials.json \
./bin/set-admin.js rm firebase-uid
```

## with docker

### 1. setup area table

*work_dir* is the directory which you put shp files in.

    % docker-compose run -v *work_dir*:/tmp --rm db manage-areas.sh -h db *shp_file*

### 2. set up and start servers

```
% docker-compose up -d
```

## without docker

### 0. requirement

- postgresql with postgis 2.4 or higher
- PosrGIS enabled database
- node.js

### 1. setup areas table
    % cd *work_dir*
    % $(project_root)/db/manage-areas.sh *shp_file*

### 2. set up and start api server
    % cd ../next
    % export NODE_ENV=xxx
    % npm install --force
    % npm run build
    % npm start

## dev mode

    % cd next
    % npm install --force
    % npm run dev

You may access http://localhost:3000 .

 demo: http://walk.asharpminor.com/
