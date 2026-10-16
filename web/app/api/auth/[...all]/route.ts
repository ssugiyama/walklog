import { getAuth } from '@/lib/auth'

// getAuth() is async (see lib/auth.ts), so better-auth's toNextJsHandler,
// which needs the instance up front, can't be used at module scope; the
// instance's own request handler does the same job.
const handler = async (request: Request) => {
  const auth = await getAuth()
  return auth.handler(request)
}

export const GET = handler
export const POST = handler
