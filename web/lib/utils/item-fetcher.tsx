'use client'
import { useEffect, useActionState, useTransition } from "react"
import { useParams } from "next/navigation"
import { getItemAction } from "../../app/lib/walk-actions"
import { useUserContext } from "./user-context"
import { useData } from "./data-context"
import { GetItemState, DataT } from "@/types"

const initialGetItemState: GetItemState = {
  idTokenExpired: false,
  current: null,
  serial: 0,
}

export function ItemFetcher() {
  const [isPending, startTransition] = useTransition()
  const [getItemState, dispatchGetItem] = useActionState(getItemAction, initialGetItemState)
  const { updateIdToken, idToken } = useUserContext()
  const params = useParams()
  const id = params.id ? Number(params.id) : null
  const [data, setData] = useData()

  const findIndexById = (id: number) => {
    return data.rows.findIndex((row) => row.id === id)
  }

  useEffect(() => {
    const index = findIndexById(id)
    if (index >= 0 && !data.rows[index].stale) {
      const newData: Partial<DataT> = {}
      newData.index = index 
      newData.prevId = index > 0 ? data.rows[index - 1].id : null
      newData.nextId = index < data.rows.length - 1 ? data.rows[index + 1].id : null
      newData.current = data.rows[index]
      setData(newData)
    } else {
      startTransition(async () => {
        await dispatchGetItem(id)
      })
    }
  }, [id, idToken])

  useEffect(() => {
    if (getItemState.serial <= 0) {
      return
    }
    if (getItemState.idTokenExpired) {
      startTransition(async () => {
        await updateIdToken()
      })
      return
    }
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

  return (
    <></>
  )
}

export default ItemFetcher
