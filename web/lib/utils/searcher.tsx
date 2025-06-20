'use client'
import { useEffect, useActionState, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import { useConfig } from "./config"
import { searchAction } from "../../app/lib/walk-actions"
import { useUserContext } from "./user-context"
import { useData } from "./data-context"
import { DataT } from "@/types"

const initialSearchState = {
  rows: [],
  count: 0,
  offset: 0,
  idTokenExpired: false,
  index: -1,
  serial: 0,
  append: false,
}

const watchKeys = ['order', 'filter', 'month', 'year', 'user', 'path', 'center', 'radius', 'cities']

export function Searcher() {
  const config = useConfig()
  const [isPending, startTransition] = useTransition()
  const [searchState, dispatchSearch] = useActionState(searchAction, initialSearchState)
  const [data, setData] = useData()
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
  const props = { ...defaultValues }
  searchParams.forEach((value, key) => {
    props[key] = ['limit', 'offset'].includes(key) ? Number(value) : value
  })
  const oldParams = new URLSearchParams(data.params)

  useEffect(() => {
    data.isPending = isPending
    setData(data)
  }, [isPending])
  useEffect(() => {
    if (watchKeys.every((key) => oldParams.get(key) === searchParams.get(key)) &&
        data.offset > 0 && props.limit > data.offset) {
        const current = data.offset
        props.offset = current
        props.limit = props.limit - current
    }
    startTransition(async () => {
      await dispatchSearch(props)
    })
  }, [searchParams, data.forceReload, idToken])

  useEffect(() => {
    if (searchState.idTokenExpired) {
      startTransition(async () => {
        await updateIdToken()
      })
      return
    }

    const newData: DataT = { ...searchState }
    newData.params = searchParams.toString()
    if (searchState.append) {
      newData.rows.unshift(...data.rows)
    }
    setData(newData)
  }, [searchState.serial])

  return (
    <></>
  )
}

export default Searcher
