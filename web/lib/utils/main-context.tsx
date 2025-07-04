'use client'
import { useReducer, useContext, useCallback, useEffect, createContext, Dispatch } from "react"
import { MouseEvent, MouseEventHandler } from "react"
const MESSAGE_ON_LEAVE = 'You have unsaved changes. Are you sure you want to leave this page?'

type MainState = {
  mode: 'content' | 'map'
  overlay: boolean
  message: string | null
  toolBoxOpened: boolean
  panoramaIndex: number
  panoramaCount: number
  autoGeolocation: boolean
  isDirty: boolean
}

type MainAction = { type: 'TOGGLE_VIEW' }
  | { type: 'OPEN_TOOL_BOX' }
  | { type: 'CLOSE_TOOL_BOX' }
  | { type: 'OPEN_SNACKBAR'; payload: string }
  | { type: 'CLOSE_SNACKBAR' }
  | { type: 'SET_OVERLAY'; payload: boolean }
  | { type: 'SET_PANORAMA_INDEX'; payload: number }
  | { type: 'SET_PANORAMA_COUNT'; payload: number }
  | { type: 'SET_AUTO_GEOLOCATION'; payload: boolean }
  | { type: 'SET_IS_DIRTY'; payload: boolean }

const initialMainState: MainState = {
  mode: 'content',
  overlay: false,
  message: null,
  toolBoxOpened: false,
  panoramaIndex: 0,
  panoramaCount: 0,
  autoGeolocation: false,
  isDirty: false,
}

const mainReducer = (state, action: MainAction) => {
  switch (action.type) {
    case 'TOGGLE_VIEW':
      return { ...state, mode: state.mode === 'map' ? 'content' : 'map' }
    case 'OPEN_TOOL_BOX':
      return { ...state, toolBoxOpened: true }
    case 'CLOSE_TOOL_BOX':
      return { ...state, toolBoxOpened: false }
    case 'OPEN_SNACKBAR':
      return { ...state, message: action.payload }
    case 'CLOSE_SNACKBAR':
      return { ...state, message: null }
    case 'SET_OVERLAY':
      return { ...state, overlay: action.payload }
    case 'SET_PANORAMA_INDEX':
      return { ...state, panoramaIndex: action.payload }
    case 'SET_PANORAMA_COUNT':
      return { ...state, panoramaCount: action.payload }
    case 'SET_AUTO_GEOLOCATION':
      return { ...state, autoGeolocation: action.payload }
    case 'SET_IS_DIRTY':
      return { ...state, isDirty: action.payload }
    default:
      return state
  }
}

const MainContext = createContext({})

export function MainContextProvider({ children }: { children: React.ReactNode }) {
  const [mainState, dispatchMain] = useReducer(mainReducer, initialMainState)

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (mainState.isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [mainState.isDirty]) 

  const interceptLink = useCallback((ev: MouseEvent) => {
    if (mainState.isDirty) {
      const confirmed = window.confirm(MESSAGE_ON_LEAVE)
      if (confirmed) {
        dispatchMain({ type: 'SET_IS_DIRTY', payload: false }) // Reset dirty state
      }
      else {
        ev.preventDefault()
        ev.stopPropagation()
      }
    }
  }, [mainState.isDirty])

  return (
    <MainContext.Provider value={[mainState, dispatchMain, interceptLink]}>
      {children}
    </MainContext.Provider>
  )
}

export function useMainContext() {
  return useContext<[MainState, Dispatch<MainAction>, MouseEventHandler<HTMLButtonElement|HTMLAnchorElement>]>(MainContext)
}

export default MainContext
