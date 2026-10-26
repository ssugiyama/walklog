import { mkdir, unlink, writeFile } from 'fs/promises'
import path from 'path'

const UPLOAD_ROOT = path.resolve(
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads'),
)

// Defense in depth: keys are built server-side from validated parts, but a
// stray `..` must never reach a file outside the upload directory.
const resolveInRoot = (key: string): string => {
  const destination = path.resolve(UPLOAD_ROOT, key)
  const relative = path.relative(UPLOAD_ROOT, destination)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path is outside the upload directory: ${key}`)
  }
  return destination
}

export const saveLocal = async (file: File, key: string): Promise<string> => {
  const destination = resolveInRoot(key)
  await mkdir(path.dirname(destination), { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(destination, buffer)
  return `/uploads/${key}`
}

// Best-effort cleanup: swallow I/O errors so a missing/already-deleted file
// never blocks the caller (e.g. a save that already succeeded). A path
// outside the upload directory still throws.
export const deleteLocal = async (urlOrKey: string): Promise<void> => {
  const destination = resolveInRoot(urlOrKey.replace(/^\/?uploads\//, ''))
  try {
    await unlink(destination)
  } catch {
    // ignore
  }
}
