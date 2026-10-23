import {
  Outlet,
  type RouterHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { useData } from '@/lib/utils/data-context'
import { useDocumentTitle } from '@/lib/utils/document-title'
import ItemFetcher from '@/lib/utils/item-fetcher'
import { walkTitle } from '@/lib/utils/meta-utils'
import { parseSearch, stringifySearch, useParams } from '@/lib/utils/navigation'
import Searcher from '@/lib/utils/searcher'
import Body from './components/body'
import WalkEditor from './routes/editor/walk-editor'
import { ErrorView, NotFound } from './routes/error-views'
import SearchBox from './routes/home/search-box'
import ItemBox from './routes/show/item-box'

function HomePage() {
  useDocumentTitle()
  return (
    <>
      <Searcher />
      <SearchBox />
    </>
  )
}

function ShowPage() {
  const [data] = useData()
  useDocumentTitle(data.current ? walkTitle(data.current) : undefined)
  return (
    <>
      <ItemFetcher />
      <ItemBox />
    </>
  )
}

function NewPage() {
  useDocumentTitle('new walk')
  return <WalkEditor mode="create" />
}

function EditPage() {
  const { id } = useParams()
  useDocumentTitle(`edit walk : ${id}`)
  return (
    <>
      <ItemFetcher />
      <WalkEditor mode="update" />
    </>
  )
}

// The shell (Body -> Main, which holds the map) lives in the root route so
// that moving between pages only swaps the <Outlet /> and never remounts it.
const rootRoute = createRootRoute({
  component: () => (
    <Body>
      <Outlet />
    </Body>
  ),
  notFoundComponent: NotFound,
  errorComponent: ErrorView,
})

const routeTree = rootRoute.addChildren([
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: HomePage,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/show/$id',
    component: ShowPage,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/new',
    component: NewPage,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/edit/$id',
    component: EditPage,
  }),
])

export function createAppRouter(history?: RouterHistory) {
  // TanStack's types demand strictNullChecks, which tsconfig leaves off.
  // @ts-expect-error TS2345
  return createRouter({
    routeTree,
    history,
    parseSearch,
    stringifySearch,
    // Errors thrown by a page (HttpError from an action, walk-editor's auth
    // checks) are caught at that page's match, so they render inside the
    // shell's <Outlet /> like Next's error/not-found files did. The root
    // errorComponent only catches failures of the shell itself.
    defaultErrorComponent: ErrorView,
    defaultNotFoundComponent: NotFound,
  })
}

export const router = createAppRouter()
