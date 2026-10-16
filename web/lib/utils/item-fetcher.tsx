'use client'
import { useParams } from 'next/navigation'
import { useActionState, useEffect, useTransition } from 'react'
import { getItemAction } from '@/lib/actions/walk-actions'
import { DataT, GetItemState } from '@/types'
import { useData } from './data-context'
import { useUserContext } from './user-context'

const initialGetItemState: GetItemState = {
  serial: 0,
}

export function ItemFetcher() {
  const [isPending, startTransition] = useTransition()
  const [getItemState, dispatchGetItem] = useActionState(
    getItemAction,
    initialGetItemState,
  )
  const { currentUser } = useUserContext()
  // `currentUser?.uid` alone can't tell "unresolved" (undefined) from
  // "signed out" (null) - both read as undefined - so the effect below would
  // never re-run when an anonymous visitor's session resolves.
  const sessionKey =
    currentUser === undefined ? undefined : (currentUser?.uid ?? null)
  const params = useParams()
  const id = params.id ? Number(params.id) : null
  const [data, setData] = useData()

  const findIndexById = (id: number) => {
    return data.rows.findIndex((row) => row.id === id)
  }

  useEffect(() => {
    // currentUser is `undefined` until the session resolves for the first
    // time (see user-context.tsx). Dispatching before that means an
    // already-logged-in user gets one anonymous-looking fetch followed by a
    // second, authenticated one once the session arrives. Waiting for it to
    // resolve collapses that back down to one dispatch.
    if (currentUser === undefined) {
      return
    }
    const index = findIndexById(id)
    if (index >= 0 && !data.rows[index].stale) {
      const newData: Partial<DataT> = { error: null }
      newData.index = index
      newData.prevId = index > 0 ? data.rows[index - 1].id : null
      newData.nextId =
        index < data.rows.length - 1 ? data.rows[index + 1].id : null
      newData.current = data.rows[index]
      setData(newData)
    } else {
      startTransition(() => {
        dispatchGetItem(id)
      })
    }
  }, [id, sessionKey])

  useEffect(() => {
    if (getItemState.serial <= 0) {
      return
    }
    const index = findIndexById(id)
    const newData: Partial<DataT> = { isPending, error: getItemState.error }
    if (index >= 0) {
      data.rows[index] = getItemState.current
      newData.rows = data.rows
      newData.current = getItemState.current
      newData.index = index
    } else {
      newData.current = getItemState.current
      newData.prevId = null
      newData.nextId = null
      newData.offset = 0
    }
    setData(newData)
  }, [getItemState.serial, isPending])

  return <></>
}

export default ItemFetcher
