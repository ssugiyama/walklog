import { HttpError } from '@/server/http-error'
import type {
  CityParams,
  CityT,
  DeleteItemState,
  GetItemState,
  SearchProps,
  SearchState,
  SelfStatusT,
  UpdateItemState,
  UserT,
  WalkT,
} from '@/types'
import { client } from './client'

// Same names and signatures as the old Server Actions, so components only
// change their import path.

type ThrowableStatus = 401 | 403 | 404

const isThrowableStatus = (status: number): status is ThrowableStatus =>
  status === 401 || status === 403 || status === 404

const readError = async (res: Response): Promise<string> => {
  try {
    const body: unknown = await res.json()
    if (
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'string'
    ) {
      return body.error
    }
  } catch {
    // Not JSON (proxy error page, ...): fall through to the status line.
  }
  return `Request failed (${res.status})`
}

// Auth/permission/not-found failures go to the error boundary; everything
// else is reported through the state, like the old actions did.
const throwIfHttpError = async (res: Response) => {
  if (isThrowableStatus(res.status)) {
    throw new HttpError(res.status, await readError(res))
  }
}

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown error'

export const getSelfStatusAction = async (): Promise<SelfStatusT> => {
  const res = await client['self-status'].$get()
  if (!res.ok) {
    throw new Error(await readError(res))
  }
  return (await res.json()).status
}

export const searchAction = async (
  prevState: SearchState,
  props: SearchProps,
): Promise<SearchState> => {
  const state = { ...prevState }
  state.serial++
  state.error = null
  state.append = props.offset > 0
  // Caught rather than thrown: the UI drives directly off the URL, so a
  // crash would lose the results already on screen.
  try {
    const res = await client.search.$post({ json: props })
    if (!res.ok) {
      state.error = await readError(res)
      return state
    }
    return Object.assign(state, await res.json())
  } catch (error) {
    state.error = messageOf(error)
    return state
  }
}

export const getItemAction = async (
  prevState: GetItemState,
  id: number,
): Promise<GetItemState> => {
  const state = { ...prevState }
  state.serial++
  state.error = null
  try {
    const res = await client.items[':id'].$get({ param: { id: String(id) } })
    if (!res.ok) {
      await throwIfHttpError(res)
      state.error = await readError(res)
      return state
    }
    const { current } = (await res.json()) as { current: WalkT }
    state.current = current
    return state
  } catch (error) {
    if (error instanceof HttpError) {
      throw error
    }
    state.error = messageOf(error)
    return state
  }
}

export const updateItemAction = async (
  prevState: UpdateItemState,
  formData: FormData,
): Promise<UpdateItemState> => {
  const state = { ...prevState }
  state.id = undefined
  state.serial++
  try {
    // Multipart bodies have no typed `form` input on this route, and $url()
    // cannot resolve the relative '/api' base, so call fetch directly.
    const res = await fetch('/api/items', {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      await throwIfHttpError(res)
      state.error = await readError(res)
      return state
    }
    const body = (await res.json()) as { id?: number; error?: string }
    if (body.error) {
      state.error = body.error
    }
    state.id = body.id
    return state
  } catch (error) {
    if (error instanceof HttpError) {
      throw error
    }
    state.error = messageOf(error)
    return state
  }
}

export const deleteItemAction = async (
  prevState: DeleteItemState,
  id: number,
): Promise<DeleteItemState> => {
  const state = { ...prevState }
  state.deleted = false
  state.serial++
  try {
    const res = await client.items[':id'].$delete({
      param: { id: String(id) },
    })
    if (!res.ok) {
      await throwIfHttpError(res)
      state.error = await readError(res)
      return state
    }
    state.deleted = true
    return state
  } catch (error) {
    if (error instanceof HttpError) {
      throw error
    }
    state.error = messageOf(error)
    return state
  }
}

export const getCityAction = async (params: CityParams): Promise<CityT[]> => {
  const res = await client.cities.$post({ json: params })
  if (!res.ok) {
    throw new Error(await readError(res))
  }
  return (await res.json()) as CityT[]
}

export const getUsersAction = async (): Promise<UserT[]> => {
  const res = await client.users.$get()
  if (!res.ok) {
    throw new Error(await readError(res))
  }
  return res.json()
}
