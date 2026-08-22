'use client'
import { useParams } from 'next/navigation'
import { useActionState, useEffect, useRef, useTransition } from 'react'
import { getItemAction } from '@/lib/actions/walk-actions'
import { DataT, GetItemState } from '@/types'
import { useData } from './data-context'
import { useUserContext } from './user-context'

const initialGetItemState: GetItemState = {
  idTokenExpired: false,
  current: null,
  serial: 0,
}

export function ItemFetcher() {
  const [isPending, startTransition] = useTransition()
  const [getItemState, dispatchGetItem] = useActionState(
    getItemAction,
    initialGetItemState,
  )
  const { updateIdToken, idToken } = useUserContext()
  const params = useParams()
  const id = params.id ? Number(params.id) : null
  const [data, setData] = useData()

  const findIndexById = (id: number) => {
    return data.rows.findIndex((row) => row.id === id)
  }

  // Set right before a retry's forced token refresh changes `idToken`, and
  // consumed by the effect below: without it, that idToken change would
  // fire this effect too, dispatching the retried fetch a second time on
  // top of the explicit retry dispatch, and if the refreshed token is still
  // rejected, each of those duplicate dispatches spawns its own retry -
  // compounding into a runaway loop of item fetches.
  const suppressNextDispatchRef = useRef(false)
  // Caps retries to one per failed fetch so a persistent verification
  // failure (not just a stale token) can't loop forever either.
  const retryCountRef = useRef(0)

  useEffect(() => {
    if (suppressNextDispatchRef.current) {
      suppressNextDispatchRef.current = false
      return
    }
    const index = findIndexById(id)
    if (index >= 0 && !data.rows[index].stale) {
      const newData: Partial<DataT> = {}
      newData.index = index
      newData.prevId = index > 0 ? data.rows[index - 1].id : null
      newData.nextId =
        index < data.rows.length - 1 ? data.rows[index + 1].id : null
      newData.current = data.rows[index]
      setData(newData)
    } else {
      retryCountRef.current = 0
      startTransition(() => {
        dispatchGetItem(id)
      })
    }
  }, [id, idToken])

  useEffect(() => {
    if (getItemState.serial <= 0) {
      return
    }
    if (getItemState.idTokenExpired) {
      if (retryCountRef.current >= 1) {
        return
      }
      retryCountRef.current += 1
      suppressNextDispatchRef.current = true
      startTransition(() => {
        void (async () => {
          await updateIdToken(true)
          dispatchGetItem(id)
        })()
      })
      return
    }
    retryCountRef.current = 0
    const index = findIndexById(id)
    const newData: Partial<DataT> = { isPending }
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
