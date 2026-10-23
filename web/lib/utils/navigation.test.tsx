import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import {
  Link,
  parseSearch,
  stringifySearch,
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from './navigation'

function renderAt(initial: string, ui: React.ReactNode) {
  const root = createRootRoute({ component: () => <>{ui}</> })
  const splat = createRoute({
    getParentRoute: () => root,
    path: '$',
    component: () => null,
  })
  const show = createRoute({
    getParentRoute: () => root,
    path: '/show/$id',
    component: () => null,
  })
  const history = createMemoryHistory({ initialEntries: [initial] })
  // TanStack's types demand strictNullChecks, which tsconfig leaves off.
  // @ts-expect-error TS2345
  const router = createRouter({
    routeTree: root.addChildren([show, splat]),
    history,
    parseSearch,
    stringifySearch,
  })
  render(<RouterProvider router={router} />)
  return { history, router }
}

describe('parseSearch / stringifySearch', () => {
  it('round-trips the query string unchanged', () => {
    const s = '?center=35.6,139.6&year=2024&filter=&order=newest_first'
    expect(stringifySearch(parseSearch(s))).toBe(s)
  })

  it('returns an empty string for empty search', () => {
    expect(stringifySearch({})).toBe('')
    expect(parseSearch('')).toEqual({})
  })

  it('keeps values as plain strings', () => {
    expect(parseSearch('?year=2024&flag=true')).toEqual({
      year: '2024',
      flag: 'true',
    })
  })
})

describe('hooks', () => {
  it('useSearchParams returns plain string values', async () => {
    let params: URLSearchParams | undefined
    function Probe() {
      params = useSearchParams()
      return <p>probe</p>
    }
    renderAt('/?year=2024&center=35.6,139.6', <Probe />)
    await screen.findByText('probe')
    expect(params?.get('year')).toBe('2024')
    expect(params?.get('center')).toBe('35.6,139.6')
    expect(params?.get('none')).toBeNull()
  })

  it('usePathname and useParams reflect the location', async () => {
    let path: string | undefined
    let p: Record<string, string> | undefined
    function Probe() {
      path = usePathname()
      p = useParams()
      return <p>probe</p>
    }
    renderAt('/show/abc?x=1', <Probe />)
    await screen.findByText('probe')
    expect(path).toBe('/show/abc')
    expect(p).toMatchObject({ id: 'abc' })
  })

  it('useRouter push/replace navigate', async () => {
    let r: ReturnType<typeof useRouter> | undefined
    function Probe() {
      r = useRouter()
      return <p>probe</p>
    }
    const { history } = renderAt('/', <Probe />)
    await screen.findByText('probe')
    await act(async () => r?.push('/show/1?a=b'))
    expect(history.location.pathname).toBe('/show/1')
    expect(history.location.search).toBe('?a=b')
    const len = history.length
    await act(async () => r?.replace('/new'))
    expect(history.location.pathname).toBe('/new')
    expect(history.length).toBe(len)
  })
})

describe('Link', () => {
  it('navigates on plain left click', async () => {
    const { history } = renderAt('/', <Link href="/show/1?a=b">go</Link>)
    await userEvent.click(await screen.findByText('go'))
    expect(history.location.pathname).toBe('/show/1')
    expect(history.location.search).toBe('?a=b')
  })

  it('renders the href attribute', async () => {
    renderAt('/', <Link href="/show/1">go</Link>)
    expect((await screen.findByText('go')).getAttribute('href')).toBe('/show/1')
  })

  it('does not navigate when onClick prevents default', async () => {
    const { history } = renderAt(
      '/',
      <Link href="/show/1" onClick={(e) => e.preventDefault()}>
        go
      </Link>,
    )
    await userEvent.click(await screen.findByText('go'))
    expect(history.location.pathname).toBe('/')
  })

  it('does not navigate on modified click', async () => {
    const { history } = renderAt('/', <Link href="/show/1">go</Link>)
    const a = await screen.findByText('go')
    fireEvent.click(a, { ctrlKey: true })
    expect(history.location.pathname).toBe('/')
  })
})
