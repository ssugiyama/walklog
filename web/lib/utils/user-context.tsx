'use client'
import { User as FirebaseUser, getAuth } from 'firebase/auth'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import {
  clearIdTokenAction,
  getSelfStatusAction,
  getUsersAction,
  setIdTokenAction,
} from '@/lib/actions/walk-actions'
import { SelfStatusT, UserT } from '@/types'

type UserContextT = {
  users: UserT[]
  idToken: string | null
  currentUser: FirebaseUser | null | undefined
  selfStatus: SelfStatusT
  setCurrentUser: (user: FirebaseUser | null) => void
  updateIdToken: () => Promise<void>
}
const initialState: UserContextT = {
  users: [],
  idToken: null,
  currentUser: null,
  selfStatus: 'anonymous',
  setCurrentUser: () => {},
  updateIdToken: async () => {},
}
const UserContext = createContext(initialState)

export function UserContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [currentUser, setCurrentUser] = useState<
    FirebaseUser | null | undefined
  >(undefined)
  // Can't read the idToken cookie here anymore now that it's httpOnly - it
  // only ever serves as a trigger for effects elsewhere, so starting empty
  // and letting the first auth callback populate it is fine.
  const [idToken, setIdToken] = useState('')
  const [users, setUsers] = useState<UserT[]>([])
  const [selfStatus, setSelfStatus] = useState<SelfStatusT>('anonymous')

  // Reads getAuth().currentUser directly rather than closing over the
  // `currentUser` state: this is also called from the onIdTokenChanged
  // listener on Firebase's own silent background token refresh, where the
  // User object is mutated in place rather than replaced, so a stale React
  // closure could hand back an already-expired token.
  const updateIdToken = useCallback(async () => {
    const user = getAuth().currentUser
    if (!user) {
      await clearIdTokenAction()
      setIdToken('')
      setSelfStatus('anonymous')
      return
    }
    const newIdToken = (await user.getIdToken()) ?? ''
    const { error } = await setIdTokenAction(newIdToken)
    if (error) {
      setIdToken('')
      setSelfStatus('anonymous')
      return
    }
    setIdToken(newIdToken)
    setSelfStatus(await getSelfStatusAction())
  }, [])

  useEffect(() => {
    void (async () => {
      setUsers(await getUsersAction())
    })()
  }, [])
  return (
    <UserContext.Provider
      value={{
        users,
        currentUser,
        setCurrentUser,
        idToken,
        selfStatus,
        updateIdToken,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUserContext() {
  return useContext(UserContext)
}
