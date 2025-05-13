'use client'
import { useState, useEffect, use } from "react"
import { usePathname, useSearchParams, useParams } from "next/navigation"
import { createContext, useContext } from "react"
import { useConfig } from "./config"
import { getUsersAction } from "../../app/lib/walk-actions"
import { init } from "next/dist/compiled/webpack/webpack"
import { initialize } from "next/dist/server/lib/render-server"

const initialState = {
    users: [],
    idToken: null,
    currentUser: null,
    setCurrentUser: null,
    updateIdToken: null,
}
const UserContext = createContext(initialState)

export function UserContextProvider({ children }: { children: React.ReactNode }) {
    const [firstLoad, setFirstLoad] = useState(true)
    const [currentUser, setCurrentUser] = useState(null)
    const iinitialIdToken = typeof document === 'undefined' || ((document.cookie + ';').match('idToken=([^¥S;]*)')||[])[1];
    const [idToken, setIdToken] = useState(iinitialIdToken)
    const [users, setUsers] = useState([])
    const updateIdToken = async () => {
        const newIdToken = await currentUser?.getIdToken() || ''
        console.log('updateIdToken', newIdToken)
        const secure = location.protocol === 'https:' ? 'secure=true' : ''
        document.cookie = `idToken=${newIdToken}; path=/; samesite=strict; ${secure}`
        setIdToken(newIdToken)
    }
    useEffect(() => {
        (async () => {
            setUsers(await getUsersAction())
        })()
    }, [])
    useEffect(() => {
        (async () => {
            // if (firstLoad) {
            //     setFirstLoad(false)
            //     return
            // }
            await updateIdToken()
        })()
    }, [currentUser])
    return (
        <UserContext.Provider value={{ 
            users, 
            currentUser, 
            setCurrentUser, 
            idToken,
            updateIdToken }}>
            {children}
        </UserContext.Provider>
    )
}

export function useUserContext() {
    return useContext(UserContext)
}
