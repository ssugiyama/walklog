'use client'
import { createContext, useContext, useState, useEffect } from "react"
import { getConfig } from "@/app/lib/walk-actions"
const ConfigContext = createContext(null)

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setCOnfig] = useState(null)
  useEffect(() => {
    getConfig().then((config) => {
      setCOnfig(config)
    })
  }, [])
  console.log('config', config)
  return (
    <ConfigContext.Provider value={config}>
      {config ? children : null}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  return useContext(ConfigContext)
}



