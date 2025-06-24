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
  const id = Number(params.id) || null
  const [data, setData] = useData()
  useEffect(() => {
    let index = -1
    if (id !== null) {
      index = data.rows.findIndex((row) => row.id === id)
    }
    if (index >= 0) {
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

    const newData = { isPending, ...getItemState,  }
    setData(newData)
  }, [getItemState.serial, isPending])

  return (
    <></>
  )
}

export default ItemFetcher
