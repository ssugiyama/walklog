#!/usr/bin/env node
// wrangler.jsonc is committed with a `$HYPERDRIVE_ID` placeholder instead of
// a real Hyperdrive id, since the id itself isn't meaningful to share across
// deployments. This substitutes the real value from an env var into a
// gitignored copy that the build/deploy/preview/cf-typegen scripts point
// wrangler at instead.
import { readFileSync, writeFileSync } from 'node:fs'

const hyperdriveId = process.env.HYPERDRIVE_ID
if (!hyperdriveId) {
  console.error(
    'HYPERDRIVE_ID is not set. Run `wrangler hyperdrive create ...` (see README.md), ' +
      'then export the id it prints, e.g.:\n' +
      '  export HYPERDRIVE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  )
  process.exit(1)
}

const template = readFileSync('wrangler.jsonc', 'utf-8')
writeFileSync(
  '.wrangler.generated.jsonc',
  template.replaceAll('$HYPERDRIVE_ID', hyperdriveId),
)
