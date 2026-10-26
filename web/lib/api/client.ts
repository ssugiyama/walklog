import { hc } from 'hono/client'
import type { ApiType } from '@/server/routes/api'

// Type-only import: no server code ends up in the browser bundle. Cookies
// travel by default because the API is served from the same origin.
export const client = hc<ApiType>('/api')
