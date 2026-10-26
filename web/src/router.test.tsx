import { act, render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router'
import type { Mock } from 'vite-plus/test'
import { getItemAction } from '@/lib/api/actions'
import { HttpError } from '@/server/http-error'
import { createAppRouter } from './router'

// jsdom does not implement scrollTo, which the router calls on navigation.
window.scrollTo = vi.fn()

const mapMounts = vi.hoisted(() => ({ count: 0 }))

vi.mock('@/src/components/map', async () => {
  const { useEffect } = await import('react')
  return {
    default: function MockGMap() {
      useEffect(() => {
        mapMounts.count++
      }, [])
      return <div data-testid="map" />
    },
  }
})

// Shell pieces unrelated to the routing under test.
vi.mock('@/src/components/nav-bar', () => ({ default: () => null }))
vi.mock('@/src/components/tool-box', () => ({ default: () => null }))
vi.mock('@/src/components/bottom-bar', () => ({ default: () => null }))
vi.mock('@/src/routes/show/elevation-box', () => ({ default: () => null }))
vi.mock('@/src/routes/show/panorama-box', () => ({ default: () => null }))

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: 'u1', name: 'User', image: null } },
      isPending: false,
    }),
  },
}))

const item = {
  id: 1,
  uid: 'u1',
  date: '2024-01-02',
  title: 'walk one',
  comment: 'hello',
  length: 1.5,
  path: [],
}

vi.mock('@/lib/api/actions', () => ({
  getUsersAction: vi.fn(async () => []),
  getSelfStatusAction: vi.fn(async () => 'active'),
  searchAction: vi.fn(async (prev) => ({
    ...prev,
    serial: prev.serial + 1,
    rows: [],
    count: 0,
    offset: 0,
  })),
  getItemAction: vi.fn(),
  getCityAction: vi.fn(),
  updateItemAction: vi.fn(),
  deleteItemAction: vi.fn(),
}))

function renderAt(path: string) {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [path] }),
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('router', () => {
  beforeEach(() => {
    mapMounts.count = 0
    ;(getItemAction as Mock).mockImplementation(async (prev) => ({
      ...prev,
      serial: prev.serial + 1,
      current: item,
    }))
  })

  it('keeps the map mounted across / -> /show/1 -> /edit/1', async () => {
    const router = renderAt('/')
    await screen.findByTestId('map')

    await act(() => router.navigate({ href: '/show/1' }))
    expect(await screen.findByTestId('ItemBox')).toBeInTheDocument()

    await act(() => router.navigate({ href: '/edit/1' }))
    expect(await screen.findByTestId('WalkEditor')).toBeInTheDocument()

    expect(screen.getAllByTestId('map')).toHaveLength(1)
    expect(mapMounts.count).toBe(1)
  })

  it('shows not-found for an unknown path, inside the shell', async () => {
    renderAt('/nonexistent')
    expect(
      await screen.findByText('the requested resource is not found or deleted'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('map')).toBeInTheDocument()
  })

  it('shows not-found when the item request fails with 404', async () => {
    ;(getItemAction as Mock).mockRejectedValue(new HttpError(404))
    // React logs the error the route boundary catches.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderAt('/show/999')
    expect(
      await screen.findByText('the requested resource is not found or deleted'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('map')).toBeInTheDocument()
    spy.mockRestore()
    warn.mockRestore()
  })

  it('sets the document title per page', async () => {
    const router = renderAt('/new')
    await screen.findByTestId('WalkEditor')
    expect(document.title).toBe('new walk | Walklog')
    await act(() => router.navigate({ href: '/show/1' }))
    await screen.findByTestId('ItemBox')
    await vi.waitFor(() =>
      expect(document.title).toBe('2024-01-02 : walk one (1.5 km) | Walklog'),
    )
  })
})
