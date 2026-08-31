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
```

Edit `.env` with your configuration:

```bash
POSTGRES_DB=walklog
POSTGRES_USER=walklog
POSTGRES_PASSWORD=walklog
```

Edit `web/.env` or add `web/.env.local` with your configuration:

```bash
SITE_NAME=Walklog
SITE_DESCRIPTION=Web application for managing your walking logs
IMAGE_PREFIX=uploads
AUTO_APPROVE_USERS=
SRID=4326
SRID_FOR_SIMILAR_SEARCH=32662
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_GOOGLE_API_KEY=your-google-maps-api-key
IMAGE_STORAGE=
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=your-r2-bucket-name
R2_PUBLIC_URL=https://pub-xxxxxxxx.r2.dev
NEXT_PUBLIC_MAP_TYPE_IDS=roadmap,hybrid,terrain,gsi
NEXT_PUBLIC_DEFAULT_CENTER=35.6762,139.6503
NEXT_PUBLIC_DEFAULT_ZOOM=12
NEXT_PUBLIC_MAP_ID=your-google-map-id
# NEXT_PUBLIC_THEME_JSON_URL=https://example.com/theme.json
NEXT_PUBLIC_SHAPE_STYLES_JSON_URL=https://example.com/shape-styles.json
THEME_COLOR="#3874cb"
# THEME_COLOR_LIGHT="#3874cb"
# THEME_COLOR_DARK="#3874cb"
# DB_URL=postgres://user:password@host/db
```

#### Environment Variables Reference

Every `NEXT_PUBLIC_*` variable below is inlined into the client-side JavaScript bundle at build time (standard Next.js behavior), unlike the rest which are read from the server's runtime environment on each request. This distinction matters for the [Cloudflare Workers](#configure-environment-variables) deployment path.

| Variable | Description | Required |
|----------|-------------|----------|
| `SITE_NAME` | Display name for the application | Yes |
| `SITE_DESCRIPTION` | Site description for meta tags | Yes |
| `IMAGE_PREFIX` | Prefix for image storage paths | Yes |
| `AUTO_APPROVE_USERS` | If set, new users are automatically approved (active) on first login instead of requiring manual approval | No |
| `IMAGE_STORAGE` | Image upload backend: `R2` for Cloudflare R2, anything else (including unset) for local disk | No |
| `R2_ACCOUNT_ID` | Cloudflare account ID (required when `IMAGE_STORAGE=R2`) | No † |
| `R2_ACCESS_KEY_ID` | R2 S3-compatible API access key ID (required when `IMAGE_STORAGE=R2`) | No † |
| `R2_SECRET_ACCESS_KEY` | R2 S3-compatible API secret access key (required when `IMAGE_STORAGE=R2`) | No † |
| `R2_BUCKET_NAME` | R2 bucket name (required when `IMAGE_STORAGE=R2`) | No † |
| `R2_PUBLIC_URL` | Public base URL for the R2 bucket (r2.dev subdomain or custom domain, required when `IMAGE_STORAGE=R2`) | No † |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key (Authentication) | Yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain, e.g. `your-project.firebaseapp.com` | Yes |
| `NEXT_PUBLIC_SHAPE_STYLES_JSON_URL` | URL to fetch shape styles configuration JSON from over the network; falls back to the bundled default when unset | No |
| `NEXT_PUBLIC_GOOGLE_API_KEY` | Google Maps JavaScript API key | Yes |
| `NEXT_PUBLIC_MAP_TYPE_IDS` | Comma-separated map types (`roadmap,hybrid,satellite,terrain,gsi`) | No |
| `NEXT_PUBLIC_MAP_ID` | Google Maps ID for custom styling | No |
| `NEXT_PUBLIC_DEFAULT_CENTER` | Default map center as `lat,lng` | Yes |
| `NEXT_PUBLIC_DEFAULT_ZOOM` | Default map zoom | No |
| `NEXT_PUBLIC_THEME_JSON_URL` | URL to fetch the material-ui theme specification JSON from over the network; falls back to the bundled default when unset | No |
| `NEXT_PUBLIC_APP_VERSION` | Version string | No |
| `SRID` | Spatial Reference System ID for coordinates | No |
| `SRID_FOR_SIMILAR_SEARCH` | SRID for similarity searches | No |
| `THEME_COLOR` | Theme color for UA in both light mode and dark mode| No |
| `THEME_COLOR_LIGHT` | Theme color for UA in light mode | No |
| `THEME_COLOR_DARK` | Theme color for UA in dark mode | No |
| `DB_URL` | PostgreSQL connection string | Yes *|
| `DB_SSL` | Enable SSL for the DB connection (`true`/`false`) | No |
| `DB_SSL_REJECT_UNAUTHORIZED` | Reject unauthorized/self-signed certificates (`false` to allow) | No |
| `DB_SSL_CA` | Base64-encoded SSL CA certificate (PEM) | No |
| `DB_SSL_KEY` | Base64-encoded SSL client key (PEM) | No |
| `DB_SSL_CERT` | Base64-encoded SSL client certificate (PEM) | No |
| `CF_WORKERS` | Set to `true` only when deploying to Cloudflare Workers (see [Option 3](#option-3-cloudflare-workers-deployment)) | No |

* if using docker, **DB_URL** is provided as an environment variable.

† only required when `IMAGE_STORAGE=R2`. When unset (or set to anything other than `R2`), uploaded images are written to `public/uploads` on the server's local disk instead.

### 5. User Approval Management

New users are `pending` (inactive) by default unless `AUTO_APPROVE_USERS` is set. Use the provided script to manage user approval:

```bash
cd web

# List pending (inactive) users
node --env-file=.env bin/manage-users.js list-pending

# Approve a user (allow them to create/edit walks)
node --env-file=.env bin/manage-users.js approve firebase-uid

# Revoke a user's approval
node --env-file=.env bin/manage-users.js rm firebase-uid
```

## Deployment Options

### Option 1: Docker Deployment (Recommended)

#### Migrate DB

```bash
docker-compose run --rm web sh -c 'pnpm migrate'
```

#### Setup Area Database

```bash
docker-compose run -v /path/to/work_dir:/tmp --rm db manage-areas.sh -a -h db shapefile.shp
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
pnpm migrate
```

#### Setup Area Database
```bash
cd /path/to/work_dir
/path/to/work_dir/db/manage-areas.sh -a shapefile.shp
```

#### Setup and Start Application
```bash
cd web
export NODE_ENV=production
pnpm install
pnpm build
pnpm start
```

### Option 3: Cloudflare Workers Deployment

Deploys the app to Cloudflare Workers via [@opennextjs/cloudflare](https://opennext.js.org/cloudflare), using Supabase Postgres as the database. Firebase Auth and R2 image storage work unchanged; this is an additional deployment target alongside Docker, not a replacement.

#### Prerequisites
- A Cloudflare account, with [`wrangler`](https://developers.cloudflare.com/workers/wrangler/) logged in (`pnpm exec wrangler login`)
- A Supabase project with the PostGIS extension enabled (`create extension if not exists postgis;`), with migrations applied (`pnpm migrate` with `DB_URL` pointed at Supabase)

#### Set Up Hyperdrive

Direct TLS connections from a Worker straight to Supabase (bypassing Hyperdrive) don't work reliably: Workers' TLS socket implementation rejects several of postgres.js's connection options (`rejectUnauthorized`, `ALPNProtocols`), and the alternative negotiation mode just hangs until timeout. [Hyperdrive](https://developers.cloudflare.com/hyperdrive/) terminates the real TLS connection to Supabase itself and hands the Worker an already-pooled local connection instead, which sidesteps all of that.

```bash
cd web
pnpm exec wrangler hyperdrive create walklog-db --connection-string="postgres://postgres:password@db.xxxx.supabase.co:5432/postgres"
```

Use Supabase's **direct** connection string here (found in the Supabase dashboard under Project Settings → Database), not the Supavisor pooler - Hyperdrive does its own pooling. The command prints an `id`, which isn't meaningful to share across deployments, so it isn't hardcoded in `wrangler.jsonc` - export it as an env var instead:

```bash
export HYPERDRIVE_ID=<the id it printed>
```

`pnpm run build`/`preview`/`deploy`/`cf-typegen` all run `scripts/render-wrangler-config.mjs` first, which substitutes `HYPERDRIVE_ID` (and `D1_DATABASE_ID`, see below) into a gitignored `.wrangler.generated.jsonc` that they then point wrangler at - `wrangler.jsonc` itself stays a generic, committable template.

#### Set Up Caching

The `'use cache'` functions in `lib/actions/walk-actions.ts` (search results, item lookups) need a place to persist cached data and track `revalidateTag` calls - without this they still work, but every call recomputes from scratch. `open-next.config.ts` wires these to an R2 bucket (`incrementalCache`) and a D1 database (`tagCache`), per [OpenNext's Cloudflare caching guide](https://opennext.js.org/cloudflare/caching). The R2 bucket (`walklog-cache`) is created automatically on first deploy; D1 needs to be created once, the same way as Hyperdrive:

```bash
cd web
pnpm exec wrangler d1 create walklog-tag-cache
export D1_DATABASE_ID=<the id it printed>
```

`pnpm run deploy`/`upload` run `opennextjs-cloudflare populateCache remote` before deploying, which (idempotently) creates the R2 bucket and the D1 `revalidations` table if they don't already exist - no separate migration step is needed. `pnpm run preview` runs the `local` variant instead, against wrangler's local emulated storage.

Time-based ISR (`revalidate: N`) isn't used anywhere in this app - only on-demand `revalidateTag`, which writes directly to the tag cache - so there's no revalidation queue to configure.

#### Configure Environment Variables

`web/wrangler.jsonc`'s `vars` only holds `CF_WORKERS=true` - a fixed property of this deployment target, not something you configure.

Every `NEXT_PUBLIC_*` variable from the [reference table](#environment-variables-reference) (`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_DEFAULT_CENTER`, etc.) is consumed by `lib/utils/config.tsx`, a client component, so it's inlined into the JavaScript bundle at build time - `wrangler secret put` has no effect on these, since the Worker never reads them at request time and the value is already baked into the built assets before `wrangler` even runs. Set them the same way you would for local development - fill in `web/.env`/`web/.env.local` per [step 4](#4-environment-variables), or export them in your shell - before running `pnpm run preview`/`deploy`/`upload`:

```bash
cd web
export NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
# ...repeat for whichever other NEXT_PUBLIC_* variables your deployment needs
pnpm run deploy
```

Every other variable from the reference table (`SITE_NAME`, `R2_*`, etc.) is read from the Worker's runtime environment on each request instead, so it's set with `wrangler secret put`:

```bash
cd web
pnpm exec wrangler secret put SITE_NAME
pnpm exec wrangler secret put R2_ACCOUNT_ID
# ...repeat for whichever other server-only variables from the reference table your deployment needs
```

`DB_URL` is the one exception among these - it's only used for the Docker/manual deployment path, not Workers (which reads the connection string from the Hyperdrive binding instead), so it doesn't need to be set here at all.

Don't add either kind of variable to `wrangler.jsonc`'s `vars` even as empty placeholders: `wrangler types` infers a var's *literal* value as its TypeScript type (breaking code elsewhere that assigns other strings to it), and an empty string is not the same as unset for the app's `?? 'default'` fallbacks - a variable left genuinely unset still gets its built-in default, but one set to `""` would not.

`wrangler` needs the Hyperdrive binding emulated locally for both `preview` and `deploy` - it can't reach the real proxy from outside Cloudflare's network. Add this once to your local (gitignored) `web/.dev.vars` rather than passing it on every command:

```
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=postgres://postgres:password@db.xxxx.supabase.co:5432/postgres
```

That local connection string can point anywhere reachable, including a local Postgres instead of Supabase directly, if you'd rather not hit production data while previewing.

#### Preview Locally, Then Deploy
```bash
pnpm run preview  # builds and runs the app under the actual Workers runtime, locally
pnpm run deploy   # publishes to Cloudflare Workers
```

If you change `wrangler.jsonc` (e.g. add a binding), regenerate the local TypeScript types with `pnpm run cf-typegen`.

`wrangler.jsonc`'s `observability.enabled` turns on Workers Logs, so invocation logs for every request are queryable in the Cloudflare dashboard (Workers & Pages → walklog → Logs) after a deploy; `pnpm exec wrangler tail` also streams them live from the CLI.

#### CI Deployment

`.github/workflows/deploy-cloudflare-workers.yml` deploys automatically whenever a GitHub release is published (`NEXT_PUBLIC_APP_VERSION` is set to the release tag), or manually via workflow dispatch. It needs these repository secrets:

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | A Cloudflare API token with permission to edit Workers/Hyperdrive for this account |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| `HYPERDRIVE_ID` | Same as `HYPERDRIVE_ID` above |
| `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` | Same as above |
| `D1_DATABASE_ID` | Same as `D1_DATABASE_ID` above |

On every deploy, the workflow pushes a fixed set of values from repository secrets/variables of the same name, so GitHub is the source of truth instead of manual configuration - using two different mechanisms, matching the two categories from [Configure Environment Variables](#configure-environment-variables) above.

Server-only variables are pushed to Cloudflare via `wrangler secret put` before the build runs:

| Repository secret | Repository variable |
|---|---|
| `R2_ACCESS_KEY_ID` | `IMAGE_STORAGE` |
| `R2_SECRET_ACCESS_KEY` | `R2_ACCOUNT_ID` |
| | `R2_BUCKET_NAME` |
| | `R2_PUBLIC_URL` |

`NEXT_PUBLIC_*` variables are instead passed as build-time environment variables to the `pnpm run deploy` step itself, since they have to be present *before* the build runs, not after (`NEXT_PUBLIC_APP_VERSION` is set fresh from the release tag; everything else comes from a repository secret or variable named after the suffix):

| Repository secret | Repository variable |
|---|---|
| `FIREBASE_API_KEY` | `FIREBASE_AUTH_DOMAIN` |
| `GOOGLE_API_KEY` | `MAP_TYPE_IDS` |
| | `DEFAULT_CENTER` |
| | `DEFAULT_ZOOM` |
| | `MAP_ID` |
| | `SHAPE_STYLES_JSON_URL` |
| | `THEME_JSON_URL` |

Any other variable from the reference table that your deployment needs (`SITE_NAME`, ...) isn't touched by CI and must still be set on Cloudflare manually with `wrangler secret put`, same as before. `DB_URL`/`DB_SSL`/`DB_SSL_CA` and `CF_WORKERS` are never set this way for Workers: the runtime reads the DB connection from the Hyperdrive binding instead of `DB_URL`/`DB_SSL*` (see `lib/drizzle/db.ts`), and `CF_WORKERS` is a fixed `vars` entry already committed in `wrangler.jsonc`.

Because CI overwrites these on every deploy, make sure the repository secrets/variables above hold real values *before* the first deploy after this workflow change - an unset one will overwrite the existing Cloudflare secret with an empty string (server-only group) or bake an empty value into the client bundle (`NEXT_PUBLIC_*` group).

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
- Verify `NEXT_PUBLIC_GOOGLE_API_KEY` is set correctly
- Check that Google Maps JavaScript API is enabled
- Ensure API key has proper restrictions and permissions

**Image Upload Issues**
- Images are uploaded to the server (not directly from the browser) and then
  saved to local disk or Cloudflare R2, depending on `IMAGE_STORAGE`
- If `IMAGE_STORAGE=R2`, verify `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, and `R2_PUBLIC_URL` are all set
  and that the R2 bucket has public access enabled at `R2_PUBLIC_URL`
- If `IMAGE_STORAGE` is unset (or anything other than `R2`), verify the
  process can write to `public/uploads` (files saved there do not survive a
  container rebuild, so this mode is best for local/simple deployments)

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
