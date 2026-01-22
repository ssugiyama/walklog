'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { getConfig } from '@/app/lib/walk-actions'
import { ConfigT } from '@/types'
const ConfigContext = createContext<ConfigT | null>(null)

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ConfigT | null>(null)
  useEffect(() => {
    void getConfig().then((config) => {
      setConfig(config)
    })
  }, [])
  return (
    <ConfigContext.Provider value={config}>
      {config ? children : null}
    </ConfigContext.Provider>
  )
}

export function useConfig(): ConfigT {
  return useContext(ConfigContext)
}



