'use client'
import { useState, useEffect, useCallback } from "react"
import { createContext, useContext } from "react"
import { getUsersAction } from "../../app/lib/walk-actions"

const initialState = {
  users: [],
  idToken: null,
  currentUser: null,
  setCurrentUser: null,
  updateIdToken: null,
}
const UserContext = createContext(initialState)

export function UserContextProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState(null)
  const iinitialIdToken = typeof document === 'undefined' || ((document.cookie + ';').match('idToken=([^¥S;]*)') || [])[1]
  const [idToken, setIdToken] = useState(iinitialIdToken)
  const [users, setUsers] = useState([])
  const updateIdToken = useCallback(async () => {
    const newIdToken = await currentUser?.getIdToken() || ''
    const secure = location.protocol === 'https:' ? 'secure=true' : ''
    document.cookie = `idToken=${newIdToken}; path=/; samesite=strict; ${secure}`
    setIdToken(newIdToken)
  }, [currentUser])
  useEffect(() => {
    (async () => {
      setUsers(await getUsersAction())
    })()
  }, [])
  useEffect(() => {
    (async () => {
      await updateIdToken()
    })()
  }, [updateIdToken])
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
