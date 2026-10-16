import { createAuthClient } from 'better-auth/react'

// baseURL is omitted: the auth routes are served from the same origin.
export const authClient = createAuthClient()
