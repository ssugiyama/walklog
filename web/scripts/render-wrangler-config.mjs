#!/usr/bin/env node
// wrangler.jsonc is committed with a `$HYPERDRIVE_ID` placeholder instead
// of the real resource id, since the id itself isn't meaningful to share
// across deployments. This substitutes the real value
// from env vars into a gitignored copy that the build/deploy/preview/
// cf-typegen scripts point wrangler at instead.
import { readFileSync, writeFileSync } from 'node:fs'

const requireEnv = (name, createCommand) => {
  const value = process.env[name]
  if (!value) {
    console.error(
      `${name} is not set. Run \`${createCommand}\` (see README.md), ` +
        `then export the id it prints, e.g.:\n` +
        `  export ${name}=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`,
    )
    process.exit(1)
  }
  return value
}

const hyperdriveId = requireEnv(
  'HYPERDRIVE_ID',
  'wrangler hyperdrive create walklog-db --connection-string=...',
)

const template = readFileSync('wrangler.jsonc', 'utf-8')
writeFileSync(
  '.wrangler.generated.jsonc',
  template.replaceAll('$HYPERDRIVE_ID', hyperdriveId),
)
