#!/usr/bin/env node
// Requires DB_URL (and DB_SSL* if applicable) to be set in the environment,
// e.g. `node --env-file=.env bin/manage-users.js list-pending`.
import ssl from '../lib/drizzle/ssl.js'

const postgres = require('postgres')

const options = {
  ssl,
}

const sql = postgres(process.env.DB_URL, options)

const usage = () => {
  console.error('usage: manage-users.js <list-pending|approve <uid>|rm <uid>>')
  process.exitCode = 1
}

const setActive = async (uid, active) => {
  const rows =
    await sql`UPDATE users SET active = ${active} WHERE uid = ${uid} RETURNING uid`
  if (rows.length === 0) {
    console.error(`user not found: ${uid}`)
    process.exitCode = 1
  } else {
    console.info('done')
  }
}

const main = async () => {
  const [command, uid] = process.argv.slice(2)
  switch (command) {
    case 'list-pending': {
      const rows =
        await sql`SELECT uid, email, display_name, created_at FROM users WHERE active = false ORDER BY created_at`
      console.table(rows)
      break
    }
    case 'approve':
      if (!uid) return usage()
      await setActive(uid, true)
      break
    case 'rm':
      if (!uid) return usage()
      await setActive(uid, false)
      break
    default:
      usage()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => sql.end())
