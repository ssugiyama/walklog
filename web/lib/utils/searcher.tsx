'use client'
import { useSearchParams } from 'next/navigation'
import { useActionState, useEffect, useRef, useTransition } from 'react'
import { searchAction } from '@/lib/actions/walk-actions'
import { DataT } from '@/types'
import { useConfig } from './config'
import { useData } from './data-context'
import { useUserContext } from './user-context'

const initialSearchState = {
  rows: [],
  count: 0,
  offset: 0,
  idTokenExpired: false,
  index: -1,
  serial: 0,
  append: false,
}

const watchKeys = [
  'order',
  'filter',
  'month',
  'year',
  'user',
  'path',
  'center',
  'radius',
  'cities',
]

export function Searcher() {
  const config = useConfig()
  const [isPending, startTransition] = useTransition()
  const [searchState, dispatchSearch] = useActionState(
    searchAction,
    initialSearchState,
  )
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

  // Set right before a retry's forced token refresh changes `idToken`, and
  // consumed by the effect below: without it, that idToken change would
  // fire this effect too, dispatching the retried search a second time on
  // top of the explicit retry dispatch, and if the refreshed token is still
  // rejected, each of those duplicate dispatches spawns its own retry -
  // compounding into a runaway loop of search actions.
  const suppressNextDispatchRef = useRef(false)
  // Caps retries to one per failed search so a persistent verification
  // failure (not just a stale token) can't loop forever either.
  const retryCountRef = useRef(0)

  useEffect(() => {
    if (suppressNextDispatchRef.current) {
      suppressNextDispatchRef.current = false
      return
    }
    if (
      watchKeys.every((key) => oldParams.get(key) === searchParams.get(key)) &&
      data.offset > 0 &&
      props.limit > data.offset
    ) {
      const current = data.offset
      props.offset = current
      props.limit = props.limit - current
    }
    retryCountRef.current = 0
    startTransition(() => {
      dispatchSearch(props)
    })
  }, [searchParams, idToken])

  useEffect(() => {
    if (searchState.serial <= 0) {
      return
    }
    if (searchState.idTokenExpired) {
      if (retryCountRef.current >= 1) {
        return
      }
      retryCountRef.current += 1
      suppressNextDispatchRef.current = true
      startTransition(() => {
        void (async () => {
          await updateIdToken(true)
          dispatchSearch(props)
        })()
      })
      return
    }
    retryCountRef.current = 0

    const newData: DataT = { isPending, ...searchState }
    newData.params = searchParams.toString()
    if (!isPending && searchState.append) {
      newData.rows.unshift(...data.rows)
    }
    setData(newData)
  }, [searchState.serial, isPending])

  return <></>
}

export default Searcher
