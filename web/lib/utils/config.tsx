'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { getConfig } from '@/lib/actions/walk-actions'
import { ConfigT } from '@/types'

const ConfigContext = createContext<ConfigT | null>(null)

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ConfigT | null>(null)
  useEffect(() => {
    const fetchConfig = async () => {
      const config = await getConfig()
      setConfig(config)
    }
    void fetchConfig()
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
