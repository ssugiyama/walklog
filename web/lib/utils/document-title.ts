import { useEffect } from 'react'

const DEFAULT_SITE_NAME = 'Walklog'

function readSiteName(): string {
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="apple-mobile-web-app-title"]',
  )
  return meta?.content || DEFAULT_SITE_NAME
}

export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    const siteName = readSiteName()
    document.title = title ? `${title} | ${siteName}` : siteName
  }, [title])
}
