'use client'
import { useState, useEffect, useCallback } from "react"
import { createContext, useContext } from "react"
import { getUsersAction } from "../../app/lib/walk-actions"
import { UserT } from "@/types"
import { User as FirebaseUser } from "firebase/auth"
type UserContextT = {
  users: UserT[]
  idToken: string | null
  currentUser: FirebaseUser | null | undefined
  setCurrentUser: (user: UserT | null) => void
  updateIdToken: () => Promise<void>
}
const initialState: UserContextT = {
  users: [],
  idToken: null,
  currentUser: null,
  setCurrentUser: () => {},
  updateIdToken: () => Promise.resolve(),
}
const UserContext = createContext(initialState)

export function UserContextProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser>(undefined)
  const getCookieValue = (name: string) => {
    if (typeof document === 'undefined') return ''
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift() || ''
    return ''
  }
  const initialIdToken = getCookieValue('idToken')
  const [idToken, setIdToken] = useState(initialIdToken)
  const [users, setUsers] = useState<UserT[]>([])
  
  const updateIdToken = useCallback(async () => {
    if (!currentUser) {
      const secure = location.protocol === 'https:' ? '; secure' : ''
      document.cookie = `idToken=; path=/; samesite=strict${secure}; expires=Thu, 01 Jan 1970 00:00:00 GMT`
      setIdToken('')
      return
    }
    const newIdToken = await currentUser?.getIdToken() || ''
    const secure = location.protocol === 'https:' ? '; secure' : ''
    // Max-Ageを1時間に設定してトークンの有効期限を管理
    document.cookie = `idToken=${newIdToken}; path=/; samesite=strict${secure}; max-age=3600`
    setIdToken(newIdToken)
  }, [currentUser])
  
  useEffect(() => {
    (async () => {
      setUsers(await getUsersAction())
    })()
  }, [])
  useEffect(() => {
    if (currentUser === undefined) {
      return
    }
    (async () => {
      await updateIdToken()
    })()
  }, [currentUser])
  return (
    <UserContext.Provider value={{
      users,
      currentUser,
      setCurrentUser,
      idToken,
      updateIdToken
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUserContext() {
  return useContext(UserContext)
}
