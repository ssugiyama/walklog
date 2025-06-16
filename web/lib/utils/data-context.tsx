'use client'
import { useState, useEffect, useActionState, useTransition } from "react"
import { useSearchParams, useParams } from "next/navigation"
import { createContext, useContext } from "react"
import { useConfig } from "./config"
import { getItemAction, searchAction } from "../../app/lib/walk-actions"
import { useUserContext } from "./user-context"

const initialData = {
  isPending: true,
  rows: [],
  current: null,
  count: 0,
  offset: 0,
  showDistance: false,
  error: null,
  index: -1,
  curernt: null,
  nextId: null,
  prevId: null,
  params: '',
  setState: null,
}

const initialSearchState = {
  rows: [],
  count: 0,
  offset: 0,
  error: null,
  idTokenExpired: false,
  index: -1,
  serial: 0,
  append: false,
}

const initialGetItemState = {
  error: null,
  idTokenExpired: false,
  curernt: null,
  serial: 0,
}

const DataContext = createContext(null)

const watchKeys = ['order', 'filter', 'month', 'year', 'user', 'path', 'center', 'radius', 'cities']

export function DataProvider({ children }: { children: React.ReactNode }) {
  const config = useConfig()
  const [isPending, startTransition] = useTransition()
  const [searchState, dispatchSearch] = useActionState(searchAction, initialSearchState)
  const [getItemState, dispatchGetItem] = useActionState(getItemAction, initialGetItemState)
  const [data, setData] = useState(initialData)
  const { updateIdToken, idToken } = useUserContext()
  const defaultValues = {
    id: null,
    filter: '',
    user: '',
    month: '',
    year: '',
    order: 'newest_first',
    limit: 20,
    offset: 0,
    center: config.defaultCenter,
    radius: '500',
    cities: '',
    path: '',
  }
  const searchParams = useSearchParams()
  const params = useParams()
  const props = { ...defaultValues }
  searchParams.forEach((value, key) => {
    props[key] = ['limit', 'offset'].includes(key) ? Number(value) : value
  })
  const id = Number(params.id) || null
  const oldParams = new URLSearchParams(data.params)

  const [forceReload, setForceReload] = useState(0)
  const reset = () => {
    setData(initialData)
    setForceReload(forceReload + 1)
  }
  useEffect(() => {
    data.isPending = isPending
    setData(data)
  }, [isPending])
  useEffect(() => {
    (async () => {
      let index = -1
      if (id !== null) {
        index = data.rows.findIndex((row) => row.id === id)
      }
      if (index >= 0) {
        const newData = { ...data }
        newData.index = index
        newData.prevId = index > 0 ? data.rows[index - 1].id : null
        newData.nextId = index < data.rows.length - 1 ? data.rows[index + 1].id : null
        newData.current = data.rows[index]
        setData(newData)
      } else {
        if (watchKeys.every((key) => oldParams.get(key) === searchParams.get(key)) &&
          data.offset > 0 && props.limit > data.offset) {
          const current = data.offset
          props.offset = current
          props.limit = props.limit - current
        }
        startTransition(async () => {
          if (id !== null) {
            await dispatchGetItem(id)
          } else {
            await dispatchSearch(props)
          }
        })
      }
    })()
  }, [id, searchParams, forceReload, idToken])

  useEffect(() => {
    if (searchState.idTokenExpired) {
      startTransition(async () => {
        await updateIdToken()
      })
      return
    }

    const newData = Object.assign({ ...initialData }, searchState)
    newData.params = searchParams.toString()
    if (searchState.append) {
      newData.rows.unshift(...data.rows)
    }
    setData(newData)
  }, [searchState.serial])

  useEffect(() => {
    if (getItemState.idTokenExpired) {
      startTransition(async () => {
        await updateIdToken()
      })
      return
    }

    const newData = Object.assign({ ...initialData }, getItemState)
    setData(newData)
  }, [getItemState.serial])

  return (
    <DataContext.Provider value={[data, reset]}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}

export default DataContext
