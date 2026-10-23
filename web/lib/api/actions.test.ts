import { HttpError } from '@/server/http-error'
import type { SearchState } from '@/types'
import {
  deleteItemAction,
  getItemAction,
  searchAction,
  updateItemAction,
} from './actions'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const searchState = (): SearchState => ({ rows: [], count: 0, serial: 1 })

describe('searchAction', () => {
  it('increments serial, sets append and merges the response', async () => {
    fetchMock.mockResolvedValue(
      json({ rows: [{ id: 1 }], count: 30, offset: 40 }),
    )
    const state = await searchAction(searchState(), { offset: 20 })
    expect(state).toMatchObject({
      serial: 2,
      append: true,
      error: null,
      count: 30,
      offset: 40,
    })
    expect(state.rows).toHaveLength(1)
  })

  it('puts a 500 into error instead of throwing', async () => {
    fetchMock.mockResolvedValue(json({ error: 'boom' }, 500))
    const state = await searchAction(searchState(), {})
    expect(state.error).toBe('boom')
    expect(state.serial).toBe(2)
    expect(state.append).toBe(false)
  })

  it('puts network failures into error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const state = await searchAction(searchState(), {})
    expect(state.error).toBe('Failed to fetch')
  })
})

describe('getItemAction', () => {
  it('rejects with HttpError(404) on not found', async () => {
    fetchMock.mockResolvedValue(json({ error: 'Not Found' }, 404))
    await expect(getItemAction({ serial: 1 }, 1)).rejects.toMatchObject({
      name: 'HttpError',
      status: 404,
    })
  })

  it('returns current on success', async () => {
    fetchMock.mockResolvedValue(json({ current: { id: 3 } }))
    const state = await getItemAction({ serial: 1 }, 3)
    expect(state).toMatchObject({ serial: 2, error: null, current: { id: 3 } })
  })

  it('puts other failures into error', async () => {
    fetchMock.mockResolvedValue(json({ error: 'x' }, 500))
    const state = await getItemAction({ serial: 1 }, 3)
    expect(state.error).toBe('x')
  })
})

describe('updateItemAction', () => {
  it('stores a service error in state.error', async () => {
    fetchMock.mockResolvedValue(
      json({ error: 'Image size must be 2MB or less' }),
    )
    const state = await updateItemAction({ serial: 1, id: 5 }, new FormData())
    expect(state.error).toBe('Image size must be 2MB or less')
    expect(state.id).toBeUndefined()
    expect(state.serial).toBe(2)
  })

  it('returns the saved id', async () => {
    fetchMock.mockResolvedValue(json({ id: 9 }))
    const state = await updateItemAction({ serial: 1 }, new FormData())
    expect(state.id).toBe(9)
  })

  it('rejects with HttpError(401) when unauthorized', async () => {
    fetchMock.mockResolvedValue(json({ error: 'Unauthorized' }, 401))
    const result = updateItemAction({ serial: 1 }, new FormData())
    await expect(result).rejects.toBeInstanceOf(HttpError)
    await expect(result).rejects.toMatchObject({ status: 401 })
  })
})

describe('deleteItemAction', () => {
  it('marks deleted on success', async () => {
    fetchMock.mockResolvedValue(json({ deleted: true }))
    const state = await deleteItemAction({ serial: 1 }, 4)
    expect(state).toMatchObject({ serial: 2, deleted: true })
  })

  it('rejects with HttpError(403)', async () => {
    fetchMock.mockResolvedValue(json({ error: 'Forbidden' }, 403))
    await expect(deleteItemAction({ serial: 1 }, 4)).rejects.toMatchObject({
      status: 403,
    })
  })
})
