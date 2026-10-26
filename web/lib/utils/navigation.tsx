import {
  RouterContextProvider,
  useLocation,
  useNavigate,
  useRouter as useTanstackRouter,
  useParams as useRouterParams,
  useRouterState,
} from '@tanstack/react-router'
import {
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  forwardRef,
  useCallback,
  useMemo,
} from 'react'

// Plain query-string codec for the router. TanStack's default JSON-parses
// values (e.g. `year=2024` becomes a number); the app needs raw strings.
// Repeated keys keep only the last value.
export function parseSearch(searchStr: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(searchStr))
}

export function stringifySearch(search: Record<string, string>): string {
  // URLSearchParams escapes `,` but URLs like `center=35.6,139.6` must
  // round-trip unchanged.
  const str = new URLSearchParams(search).toString().replaceAll('%2C', ',')
  return str ? `?${str}` : ''
}

export function useSearchParams(): URLSearchParams {
  const searchStr = useRouterState({ select: (s) => s.location.searchStr })
  return useMemo(() => new URLSearchParams(searchStr), [searchStr])
}

export function useParams(): Record<string, string> {
  return useRouterParams({ strict: false }) as Record<string, string>
}

export function usePathname(): string {
  return useLocation().pathname
}

export function useRouter(): {
  push(href: string): void
  replace(href: string): void
} {
  const navigate = useNavigate()
  return useMemo(
    () => ({
      push: (href) => void navigate({ href }),
      replace: (href) => void navigate({ href, replace: true }),
    }),
    [navigate],
  )
}

// A tree rendered with its own createRoot() (e.g. a Google Maps info window)
// does not inherit React context. Wrap it with the returned function so its
// Links navigate through the app's router.
export function useWithRouter(): (node: ReactNode) => ReactNode {
  const router = useTanstackRouter({ warn: false })
  return useCallback(
    (node: ReactNode) =>
      router ? (
        <RouterContextProvider router={router}>{node}</RouterContextProvider>
      ) : (
        node
      ),
    [router],
  )
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string
  // Same as next/link: `false` keeps the scroll position on navigation.
  scroll?: boolean
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, onClick, target, scroll, ...rest },
  ref,
) {
  // Without a router (outside <RouterProvider>) the click falls back to a
  // native page load.
  const router = useTanstackRouter({ warn: false })
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (
      !router ||
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      (target && target !== '_self') ||
      !href.startsWith('/')
    ) {
      return
    }
    e.preventDefault()
    void router.navigate({ href, resetScroll: scroll !== false })
  }
  return (
    <a ref={ref} href={href} target={target} onClick={handleClick} {...rest} />
  )
})
