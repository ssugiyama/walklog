import { resolveThemeColors, themeBackgroundCss } from '@/lib/utils/theme-color'

export type HeadData = {
  title?: string
  description?: string
  ogTitle?: string
  ogUrl?: string
  ogImage?: string
}

export const HEAD_PLACEHOLDER = '<!--app-head-->'

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const meta = (attr: 'name' | 'property', key: string, value?: string) =>
  value === undefined
    ? ''
    : `<meta ${attr}="${key}" content="${escapeHtml(value)}">`

export const renderHead = (
  head: HeadData,
  env: Record<string, string | undefined>,
) => {
  const siteName = env.SITE_NAME || 'Walklog'
  const colors = resolveThemeColors(env)
  const title = head.title ? `${head.title} | ${siteName}` : siteName
  const themeColor =
    colors.light === colors.dark
      ? meta('name', 'theme-color', colors.light)
      : `<meta name="theme-color" media="(prefers-color-scheme: light)" content="${escapeHtml(colors.light)}">` +
        `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="${escapeHtml(colors.dark)}">`
  return [
    `<title>${escapeHtml(title)}</title>`,
    meta('name', 'description', head.description),
    meta('property', 'og:title', head.ogTitle),
    meta('property', 'og:description', head.ogTitle && head.description),
    meta('property', 'og:url', head.ogUrl),
    meta('property', 'og:image', head.ogImage),
    themeColor,
    `<style>${themeBackgroundCss(colors)}</style>`,
    meta('name', 'apple-mobile-web-app-capable', 'yes'),
    meta('name', 'apple-mobile-web-app-title', siteName),
    meta('name', 'apple-mobile-web-app-status-bar-style', 'default'),
    '<link rel="manifest" href="/manifest.webmanifest">',
  ]
    .filter(Boolean)
    .join('')
}

export const injectHead = (template: string, headHtml: string) =>
  template.replace(HEAD_PLACEHOLDER, () => headHtml)
