# Walklog

Walklog is a web application for managing and tracking walking paths with map visualization and route recording capabilities.

## Features

- Interactive map interface for viewing and creating walking routes
- Path recording and management
- User authentication via Firebase
- Image upload and storage
- Geographic data visualization
- Admin user management
- Multiple map types support (Google Maps, GSI Japan)

## Prerequisites

- Node.js (version 14 or higher)
- PostgreSQL with PostGIS extension
- Firebase project with authentication enabled
- Google Maps API key
- Docker (optional, for containerized deployment)

## Setup

### 1. Clone Repository

```bash
git clone https://github.com/ssugiyama/walklog.git
cd walklog
```

### 2. Import Geographic Data (Shape Files)

You can obtain Japanese geographic data from either:

**Option A: ESRI Japan**
- Visit http://www.esrij.com/products/gis_data/japanshp/japanshp.html
- Download `japan_verXX.zip`
- Extract files to a working directory

**Option B: National Land Numerical Information**
- Visit http://nlftp.mlit.go.jp/ksj/jpgis/datalist/KsjTmplt-N03.html
- Download data and convert to SHP format

### 3. Firebase Configuration

1. Create a Firebase project at https://console.firebase.google.com
2. Create a web app in your Firebase project
3. Enable Google Authentication in Firebase Console
4. Create a service account for Firebase Admin SDK
5. Download the following files:
   - Firebase web app configuration JSON
   - Service account credentials JSON
6. Place both files in an arbitrary directory

### 4. Environment Variables

Copy the environment template and configure:

```bash
cp .env.example .env
cp web/.env web/.env.local
```

Edit `.env` with your configuration:

```bash
POSTGRES_DB=walklog
POSTGRES_USER=walklog
POSTGRES_PASSWORD=walklog
```

Edit `web/.env.local` with your configuration:

```bash
SITE_NAME=Walklog
SITE_DESCRIPTION=Web application for managing your walking logs
IMAGE_PREFIX=uploads
OPEN_USER_MODE=
SHAPE_STYLES_JSON=/default-shape-styles.json
SRID=4326
SRID_FOR_SIMILAR_SEARCH=32662
FIREBASE_CONFIG=path-to-firebase-config.json
GOOGLE_API_KEY=your-google-maps-api-key
FIREBASE_STORAGE=on
MAP_TYPE_IDS=roadmap,hybrid,terrain,gsi
DEFAULT_CENTER=35.6762,139.6503
DEFAULT_ZOOM=12
MAP_ID=your-google-map-id
GOOGLE_APPLICATION_CREDENTIALS=path-to-service-account.json
THEME_COLOR="#3874cb"
# THEME_COLOR_LIGHT="#3874cb"
# THEME_COLOR_DARK="#3874cb"
# DB_URL=postgres://user:password@host/db
```

#### Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `SITE_NAME` | Display name for the application | Yes |
| `SITE_DESCRIPTION` | Site description for meta tags | Yes |
| `IMAGE_PREFIX` | Prefix for image storage paths | Yes |
| `OPEN_USER_MODE` | If set, allows all users to manage walks | No |
| `FIREBASE_CONFIG` | Path to Firebase web config JSON | Yes |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Firebase service account JSON | Yes |
| `FIREBASE_STORAGE` | Enable Firebase Storage for images (`on`/`off`) | Yes |
| `DRAWING_STYLES_JSON` | Path to drawing styles configuration | No |
| `GOOGLE_API_KEY` | Google Maps JavaScript API key | Yes |
| `MAP_TYPE_IDS` | Comma-separated map types (`roadmap,hybrid,satellite,terrain,gsi`) | No |
| `MAP_ID` | Google Maps ID for custom styling | No |
| `DEFAULT_CENTER` | Default map center as `lat,lng` | Yes |
| `DEFAULT_ZOOM` | Default map zoom | No |
| `SRID` | Spatial Reference System ID for coordinates | No |
| `SRID_FOR_SIMILAR_SEARCH` | SRID for similarity searches | No |
| `THEME_JSON` | Theme specification for material-ui | No |
| `THEME_COLOR` | Theme color for UA in both light mode and dark mode| No |
| `THEME_COLOR_LIGHT` | Theme color for UA in light mode | No |
| `THEME_COLOR_DARK` | Theme color for UA in dark mode | No |
| `DB_URL` | PostgreSQL connection string | Yes(The environment variable *DB_URL* have higher priority) |

### 5. Admin User Management

To manage admin users, use the provided script:

```bash
cd web

# Add admin user
GOOGLE_APPLICATION_CREDENTIALS=path-to-service-account.json \
./bin/set-admin.js add firebase-uid

# Remove admin user
GOOGLE_APPLICATION_CREDENTIALS=path-to-service-account.json \
./bin/set-admin.js rm firebase-uid
```

## Deployment Options

### Option 1: Docker Deployment (Recommended)

#### Migrate DB

```bash
docker-compose run --rm web sh -c 'npx sequelize-cli db:migrate --url $DB_URL'
```

#### Setup Area Database

```bash
docker-compose run -v /path/to/work_dir:/tmp --rm db manage-areas.sh -h db shapefile.shp
```

#### Start Services
```bash
docker-compose up -d
```

The application will be available at http://localhost:3000

### Option 2: Manual Deployment

#### Prerequisites
- PostgreSQL with PostGIS 2.4 or higher
- PostGIS-enabled database
- Node.js
- pnpm


#### Migrate DB

```bash
cd /path/to/work_dir/web
npx sequelize-cli db:migrate --url db_url
```

#### Setup Area Database
```bash
cd /path/to/work_dir
/path/to/work_dir/db/manage-areas.sh shapefile.shp
```

#### Setup and Start Application
```bash
cd web
export NODE_ENV=production
pnpm install
pnpm build
pnpm start
```

## Development

### Development Mode
```bash
cd web
pnpm install
pnpm dev
```

Access the development server at http://localhost:3000

### Project Structure
```
walklog/
├── web/            # Next.js application
├── db/             # Database scripts and migrations
├── docker-compose.yml
└── README.md
```

## Troubleshooting

### Common Issues

**Database Connection Errors**
- Verify PostgreSQL is running and accessible
- Check DB_URL format: `postgres://user:password@host:port/database`
- Ensure PostGIS extension is enabled

**Firebase Authentication Issues**
- Verify Firebase configuration files are correctly placed
- Check that Google Authentication is enabled in Firebase Console
- Ensure service account has proper permissions

**Map Not Loading**
- Verify `GOOGLE_API_KEY` is set correctly
- Check that Google Maps JavaScript API is enabled
- Ensure API key has proper restrictions and permissions

**Image Upload Issues**
- Check Firebase Storage rules and permissions
- Verify `FIREBASE_STORAGE` environment variable
- Ensure service account has Storage Admin role

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License

## Demo

Live demo: http://walk.asharpminor.com/

## Support

For issues and questions, please create an issue on the GitHub repository.
