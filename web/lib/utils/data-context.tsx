'use client'
import { useState } from 'react'
import { createContext, useContext } from 'react'
import { DataT } from '@/types'
const initialData: DataT = {
  isPending: true,
  rows: [],
  current: null,
  count: 0,
  offset: 0,
  showDistance: false,
  index: -1,
  nextId: null,
  prevId: null,
  params: '',
}

type DataContextT = [DataT, (data: Partial<DataT>) => void]
const DataContext = createContext<DataContextT | null>(null)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DataT>(initialData)
  const setDataExternal = (d: Partial<DataT>) => {
    setData({ ...data, ...d }) 
  }
  return (
    <DataContext.Provider value={[data, setDataExternal]}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext<DataContextT>(DataContext)
}

export default DataContext
