import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { Hono } from 'hono'
import { clientStaticFiles } from './node-static'

const IMMUTABLE = 'public, max-age=31536000, immutable'

describe('clientStaticFiles', () => {
  let root: string
  let app: Hono

  beforeAll(() => {
    root = mkdtempSync(path.join(tmpdir(), 'walklog-static-'))
    mkdirSync(path.join(root, 'assets'))
    writeFileSync(path.join(root, 'assets', 'app-abc.js'), 'console.log(1)')
    writeFileSync(path.join(root, 'favicon.ico'), 'ico')
    app = new Hono()
      .use('*', clientStaticFiles(root))
      // Like the page routes: file-like paths that reach them are 404s.
      .get('*', (c) =>
        c.req.path.includes('.') ? c.notFound() : c.text('page'),
      )
  })

  afterAll(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('serves existing assets as immutable', async () => {
    const res = await app.request('/assets/app-abc.js')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('console.log(1)')
    expect(res.headers.get('Cache-Control')).toBe(IMMUTABLE)
  })

  it('does not mark a missing asset immutable', async () => {
    const res = await app.request('/assets/does-not-exist.js')
    expect(res.status).toBe(404)
    expect(res.headers.get('Cache-Control')).toBeNull()
  })

  it('serves other files without the immutable header', async () => {
    const res = await app.request('/favicon.ico')
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBeNull()
  })

  it('passes extension-less paths to the page routes', async () => {
    expect(await (await app.request('/show/1')).text()).toBe('page')
  })
})
