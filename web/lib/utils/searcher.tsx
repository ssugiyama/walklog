import { useSearchParams } from '@/lib/utils/navigation'
import { useActionState, useEffect, useTransition } from 'react'
import { searchAction } from '@/lib/api/actions'
import { DataT } from '@/types'
import { useConfig } from './config'
import { useData } from './data-context'
import { useUserContext } from './user-context'

const initialSearchState = {
  rows: [],
  count: 0,
  offset: 0,
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
  const { currentUser } = useUserContext()
  // `currentUser?.uid` alone can't tell "unresolved" (undefined) from
  // "signed out" (null) - both read as undefined - so the effect below would
  // never re-run when an anonymous visitor's session resolves.
  const sessionKey =
    currentUser === undefined ? undefined : (currentUser?.uid ?? null)
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
    // currentUser is `undefined` until the session resolves for the first
    // time (see user-context.tsx). Dispatching before that means an
    // already-logged-in user gets one anonymous-looking search followed by a
    // second, authenticated one once the session arrives. Waiting for it to
    // resolve collapses that back down to one dispatch.
    if (currentUser === undefined) {
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
    startTransition(() => {
      dispatchSearch(props)
    })
  }, [searchParams, sessionKey])

  useEffect(() => {
    if (searchState.serial <= 0) {
      return
    }
    // searchAction catches its own errors into state rather than throwing,
    // precisely so a bad request (e.g. an out-of-range limit typed into the
    // URL) surfaces this message instead of an opaque "Minified React error
    // #441". searchState.error flows into data.error below, where
    // main.tsx swaps the whole app shell for a real error screen; skip the
    // append merge in that case since searchState.rows is just the stale
    // previous rows carried through unchanged, not a new page to prepend.
    const newData: DataT = { isPending, ...searchState }
    newData.params = searchParams.toString()
    if (!isPending && searchState.append && !searchState.error) {
      newData.rows.unshift(...data.rows)
    }
    setData(newData)
  }, [searchState.serial, isPending])

  return <></>
}

export default Searcher
