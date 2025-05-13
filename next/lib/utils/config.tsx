'use client'
import { createContext, useContext, useEffect, useState } from "react"
import { getServerConfig } from '@/app/lib/walk-actions'
const configuration = {
    googleApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
    googleApiVersion: process.env.NEXT_PUBLIC_GOOGLE_API_VERSION || 'weekly',
    appVersion: '0.9.0',
    themePrimary: process.env.NEXT_PUBLIC_THEME_PRIMARY,
    themeSecondary: process.env.NEXT_PUBLIC_THEME_SECONDARY,
    darkThemePrimary: process.env.NEXT_PUBLIC_DARK_THEME_PRIMARY,
    darkThemeSecondary: process.env.NEXT_PUBLIC_DARK_THEME_SECONDARY,
    itemPrefix: '/walk/',
    defaultCenter: process.env.NEXT_PUBLIC_DEFAULT_CENTER,
    defaultRadius: 500,
    mapTypeIds: process.env.NEXT_PUBLIC_MAP_TYPE_IDS || 'roadmap,hybrid,satellite,terrain',
    mapId: process.env.NEXT_PUBLIC_MAP_ID,
}

const ConfigContext = createContext(null)

export function ConfigProvider({ children, config }: { children: React.ReactNode }) {
    console.log('ConfigProvider', config)
    // const [config, setConfig] = useState(null)
    // useEffect(() => {
    //     (async () => {
    //         const serverConfig = await getServerConfig()
    //         setConfig({
    //             ...configuration,
    //             firebaseConfig: serverConfig.firebaseConfig,
    //             drawingStyles: serverConfig.drawingStyles,
    //         })
    //     })()
    // }, [])

    // if (!config) {
    //     return <div>Loading</div>
    // }

    return (
        <ConfigContext.Provider value={{ ...config, ...configuration }}>
            {children}
        </ConfigContext.Provider>
    )
}

export function useConfig() {
    return useContext(ConfigContext)
}



