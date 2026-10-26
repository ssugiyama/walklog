import { Theme } from '@mui/material'
import { createContext, use, useMemo } from 'react'
import { ConfigT, ShapeStyles } from '@/types'
import defaultShapeStyles from '../../default-shape-styles.json'
import defaultTheme from '../../default-theme.json'

const ConfigContext = createContext<Promise<ConfigT> | undefined>(undefined)

const readJsonConfig = async (
  url: string | undefined,
  defaultValue: unknown,
): Promise<unknown> => {
  if (url) {
    const response = await fetch(url)
    return response.json()
  }
  return defaultValue
}

const getConfig = async (): Promise<ConfigT> => {
  const shapeStyles = (await readJsonConfig(
    import.meta.env.NEXT_PUBLIC_SHAPE_STYLES_JSON_URL,
    defaultShapeStyles,
  )) as ShapeStyles
  const theme = (await readJsonConfig(
    import.meta.env.NEXT_PUBLIC_THEME_JSON_URL,
    defaultTheme,
  )) as Theme

  return {
    googleApiKey: import.meta.env.NEXT_PUBLIC_GOOGLE_API_KEY,
    googleApiVersion:
      import.meta.env.NEXT_PUBLIC_GOOGLE_API_VERSION || 'weekly',
    appVersion: import.meta.env.NEXT_PUBLIC_APP_VERSION || 'dev',
    defaultCenter: import.meta.env.NEXT_PUBLIC_DEFAULT_CENTER,
    defaultZoom: parseInt(import.meta.env.NEXT_PUBLIC_DEFAULT_ZOOM || '12', 10),
    defaultRadius: 500,
    mapTypeIds:
      import.meta.env.NEXT_PUBLIC_MAP_TYPE_IDS ||
      'roadmap,hybrid,satellite,terrain',
    mapId: import.meta.env.NEXT_PUBLIC_MAP_ID,
    shapeStyles,
    theme,
  }
}

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  // getConfig() must be called at most once per mount: `use()` re-suspends
  // whenever it's handed a new Promise instance, so creating one directly in
  // the render body (a fresh Promise on every re-render) would re-fetch
  // shape-styles/theme and re-suspend every consumer on every re-render of
  // this provider (e.g. every client-side navigation, since `children`
  // changes on each route).
  const config = useMemo(() => getConfig(), [])
  return (
    <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
  )
}

export function useConfig(): ConfigT {
  return use(use(ConfigContext))
}
