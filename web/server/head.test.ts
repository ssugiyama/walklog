import { injectHead, renderHead } from './head'

describe('renderHead', () => {
  it('formats title with site name', () => {
    expect(renderHead({ title: 'x' }, { SITE_NAME: 'W' })).toContain(
      '<title>x | W</title>',
    )
  })

  it('uses the site name alone, defaulting to Walklog', () => {
    expect(renderHead({}, { SITE_NAME: 'W' })).toContain('<title>W</title>')
    expect(renderHead({}, {})).toContain('<title>Walklog</title>')
  })

  it('escapes html in values', () => {
    const html = renderHead({ title: '<script>alert(1)</script>' }, {})
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('emits one theme-color when light equals dark', () => {
    const html = renderHead({}, { THEME_COLOR: '#123456' })
    expect(html.match(/name="theme-color"/g)).toHaveLength(1)
    expect(html).not.toContain('media=')
  })

  it('emits two media-qualified theme-colors when they differ', () => {
    const html = renderHead({}, {})
    expect(html.match(/name="theme-color"/g)).toHaveLength(2)
    expect(html).toContain('media="(prefers-color-scheme: dark)"')
  })

  it('includes og tags, manifest and web app meta', () => {
    const html = renderHead(
      { ogTitle: 't', ogUrl: '/show/1', ogImage: 'http://i/x.png' },
      {},
    )
    expect(html).toContain('property="og:image" content="http://i/x.png"')
    expect(html).toContain('property="og:url" content="/show/1"')
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest">')
    expect(html).toContain('apple-mobile-web-app-status-bar-style')
  })
})

describe('injectHead', () => {
  it('replaces the placeholder literally', () => {
    expect(injectHead('<head><!--app-head--></head>', 'a$&b')).toBe(
      '<head>a$&b</head>',
    )
  })
})
