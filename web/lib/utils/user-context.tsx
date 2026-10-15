'use client'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getSelfStatusAction, getUsersAction } from '@/lib/actions/walk-actions'
import { authClient } from '@/lib/auth-client'
import { SelfStatusT, UserT } from '@/types'

export type CurrentUserT = {
  uid: string
  displayName: string
  photoURL: string
}

// The fields of better-auth's session user this app reads. Typed here rather
// than inferred: with TypeScript 7 and better-auth 1.7, `useSession().data`
// is inferred as `never`, so the narrowing below is done by hand.
type SessionUserT = { id: string; name: string; image?: string | null }

type UserContextT = {
  users: UserT[]
  // `undefined`: the session hasn't resolved yet; `null`: resolved, signed
  // out. Consumers like Searcher/ItemFetcher use the difference to wait for
  // the first resolution instead of firing once anonymously and again once
  // the real state arrives.
  currentUser: CurrentUserT | null | undefined
  selfStatus: SelfStatusT
}
const initialState: UserContextT = {
  users: [],
  currentUser: undefined,
  selfStatus: 'anonymous',
}
const UserContext = createContext(initialState)

export function UserContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { data, isPending } = authClient.useSession()
  const sessionUser = (data as { user: SessionUserT } | null | undefined)?.user
  const currentUser = useMemo<CurrentUserT | null | undefined>(() => {
    if (isPending) return undefined
    if (!sessionUser) return null
    return {
      uid: sessionUser.id,
      displayName: sessionUser.name,
      photoURL: sessionUser.image ?? '',
    }
  }, [isPending, sessionUser?.id, sessionUser?.name, sessionUser?.image])
  const [users, setUsers] = useState<UserT[]>([])
  const [selfStatus, setSelfStatus] = useState<SelfStatusT>('anonymous')

  useEffect(() => {
    void (async () => {
      setUsers(await getUsersAction())
    })()
  }, [])

  useEffect(() => {
    if (!currentUser) {
      setSelfStatus('anonymous')
      return
    }
    void (async () => {
      setSelfStatus(await getSelfStatusAction())
    })()
  }, [currentUser?.uid])

  return (
    <UserContext.Provider value={{ users, currentUser, selfStatus }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUserContext() {
  return useContext(UserContext)
}
