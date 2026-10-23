import { type AnchorHTMLAttributes, type MouseEvent, forwardRef } from 'react'

// Test stand-in for navigation.tsx's Link, for tests that mock
// '@/lib/utils/navigation' and so have no router: a plain anchor that runs
// onClick and then swallows the click (jsdom cannot follow links).
export const MockLink = forwardRef<
  HTMLAnchorElement,
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; scroll?: boolean }
>(function MockLink({ onClick, scroll, ...rest }, ref) {
  return (
    <a
      ref={ref}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e)
        e.preventDefault()
      }}
      {...rest}
    />
  )
})
