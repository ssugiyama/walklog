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
  forceReload: 0,
}

const DataContext = createContext(null)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DataT>(initialData)
  const reset = () => {
    setData(initialData)
  }

  const setDataExternal = (d) => {
    setData({ ...data, ...d }) 
  }
  return (
    <DataContext.Provider value={[data, setDataExternal, reset]}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}

export default DataContext
