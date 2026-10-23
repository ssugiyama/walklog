import { getAuth } from '@/lib/auth'
import type { SelfStatusT } from '@/types'

// A failing session lookup is treated as anonymous so search and item
// fetching keep working.
export const getSessionUser = async (headers: Headers) => {
  try {
    const auth = await getAuth()
    const session = await auth.api.getSession({ headers })
    return session?.user ?? undefined
  } catch (error) {
    console.error('failed to get session', error)
    return undefined
  }
}

export type SessionUser = NonNullable<
  Awaited<ReturnType<typeof getSessionUser>>
>

export const getUid = async (headers: Headers): Promise<string | null> => {
  const user = await getSessionUser(headers)
  return user?.active ? user.id : null
}

export const getSelfStatus = async (headers: Headers): Promise<SelfStatusT> => {
  const user = await getSessionUser(headers)
  if (!user) {
    return 'anonymous'
  }
  return user.active ? 'active' : 'pending'
}
