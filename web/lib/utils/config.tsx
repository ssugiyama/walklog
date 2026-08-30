'use client'

import { Theme } from '@mui/material'
import { createContext, use } from 'react'
import { ConfigT, ShapeStyles } from '@/types'
import defaultShapeStyles from '../../default-shape-styles.json'
import defaultTheme from '../../default-theme.json'

const ConfigContext = createContext<Promise<ConfigT> | null>(null)

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

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const getConfig = async (): Promise<ConfigT> => {
    const shapeStyles = (await readJsonConfig(
      process.env.NEXT_PUBLIC_SHAPE_STYLES_JSON_URL,
      defaultShapeStyles,
    )) as ShapeStyles
    const theme = (await readJsonConfig(
      process.env.NEXT_PUBLIC_THEME_JSON_URL,
      defaultTheme,
    )) as Theme

    return {
      googleApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
      googleApiVersion: process.env.NEXT_PUBLIC_GOOGLE_API_VERSION ?? 'weekly',
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION || 'dev',
      defaultCenter: process.env.NEXT_PUBLIC_DEFAULT_CENTER,
      defaultZoom: parseInt(process.env.NEXT_PUBLIC_DEFAULT_ZOOM ?? '12', 10),
      defaultRadius: 500,
      mapTypeIds:
        process.env.NEXT_PUBLIC_MAP_TYPE_IDS ??
        'roadmap,hybrid,satellite,terrain',
      mapId: process.env.NEXT_PUBLIC_MAP_ID,
      firebaseConfig: {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      },
      shapeStyles,
      theme,
    }
  }
  return (
    <ConfigContext.Provider value={getConfig()}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig(): ConfigT {
  return use(use(ConfigContext))
}
