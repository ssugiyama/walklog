'use client'
import { useState } from "react"
import { createContext, useContext } from "react"
import { DataT } from "@/types"
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

const DataContext = createContext(null)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DataT>(initialData)
  const setDataExternal = (d) => {
    setData({ ...data, ...d }) 
  }
  return (
    <DataContext.Provider value={[data, setDataExternal]}>
      {children}
    </DataContext.Provider>
  )
}

export function useData(): [DataT, (data: Partial<DataT>) => void, () => void] {
  return useContext(DataContext)
}

export default DataContext
