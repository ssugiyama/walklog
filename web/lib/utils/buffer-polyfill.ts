import { Buffer } from 'buffer'

// wkx (used by geo-utils on the client too) relies on the Node `Buffer`
// global. Next.js's bundlers inject it for the browser automatically; Vite
// (vinext) doesn't, so provide it here. Must be imported before wkx.
globalThis.Buffer ??= Buffer
