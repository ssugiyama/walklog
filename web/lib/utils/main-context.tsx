'use client'
import { useReducer, useContext, createContext, Dispatch } from "react"

type MainState = {
  mode: 'content' | 'map'
  overlay: boolean
  message: string | null
  toolBoxOpened: boolean
  panoramaIndex: number
  panoramaCount: number
  autoGeolocation: boolean
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

const initialMainState: MainState = {
  mode: 'content',
  overlay: false,
  message: null,
  toolBoxOpened: false,
  panoramaIndex: 0,
  panoramaCount: 0,
  autoGeolocation: false,
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
    default:
      return state
  }
}

const MainContext = createContext({})

export function MainContextProvider({ children }: { children: React.ReactNode }) {
  const [mainState, dispatchMain] = useReducer(mainReducer, initialMainState)
  return (
    <MainContext.Provider value={[mainState, dispatchMain]}>
      {children}
    </MainContext.Provider>
  )
}

export function useMainContext() {
  return useContext<[MainState, Dispatch<MainAction>]>(MainContext)
}

export default MainContext
