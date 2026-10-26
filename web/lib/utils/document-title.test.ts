import { renderHook } from '@testing-library/react'
import { useDocumentTitle } from './document-title'

function setMeta(content?: string) {
  document.head
    .querySelectorAll('meta[name="apple-mobile-web-app-title"]')
    .forEach((m) => m.remove())
  if (content === undefined) return
  const m = document.createElement('meta')
  m.name = 'apple-mobile-web-app-title'
  m.content = content
  document.head.appendChild(m)
}

describe('useDocumentTitle', () => {
  afterEach(() => setMeta())

  it('appends the site name from the meta tag', () => {
    setMeta('W')
    renderHook(() => useDocumentTitle('x'))
    expect(document.title).toBe('x | W')
  })

  it('uses only the site name without a title', () => {
    setMeta('W')
    renderHook(() => useDocumentTitle())
    expect(document.title).toBe('W')
  })

  it('falls back to Walklog without the meta tag', () => {
    renderHook(() => useDocumentTitle('x'))
    expect(document.title).toBe('x | Walklog')
  })
})
