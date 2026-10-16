'use client'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
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

const subscribeNever = () => () => {}

export function UserContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { data, isPending } = authClient.useSession()
  const sessionUser = (data as { user: SessionUserT } | null | undefined)?.user
  // better-auth reports isPending=true on every refetch (tab focus, back
  // online) while `data` is still null, which is the case for every signed-out
  // visitor. Only the very first resolution should read as "pending";
  // otherwise Searcher/ItemFetcher would see undefined -> null again and
  // re-run their request on each tab switch.
  const [resolved, setResolved] = useState(false)
  if (!isPending && !resolved) {
    setResolved(true)
  }
  const currentUser = useMemo<CurrentUserT | null | undefined>(() => {
    if (isPending && !resolved) return undefined
    if (!sessionUser) return null
    return {
      uid: sessionUser.id,
      displayName: sessionUser.name,
      photoURL: sessionUser.image ?? '',
    }
  }, [
    isPending,
    resolved,
    sessionUser?.id,
    sessionUser?.name,
    sessionUser?.image,
  ])
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
  const value = useContext(UserContext)
  // The server never has a session, but a client component that hydrates
  // later (e.g. NavBar inside a Suspense boundary) can read a context value
  // that already has one, and would render different HTML (the avatar <img>).
  // useSyncExternalStore's server snapshot is used for the component that
  // calls it while that component hydrates, whenever that happens, so the
  // gate has to live here in the consumer rather than in the provider.
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  )
  return hydrated ? value : initialState
}
