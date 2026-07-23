import { mkdir, unlink, writeFile } from 'fs/promises'
import path from 'path'

const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads')

export const saveLocal = async (file: File, key: string): Promise<string> => {
  const destination = path.join(UPLOAD_ROOT, key)
  await mkdir(path.dirname(destination), { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(destination, buffer)
  return `/uploads/${key}`
}

// Best-effort cleanup: swallow errors so a missing/already-deleted file
// never blocks the caller (e.g. a save that already succeeded).
export const deleteLocal = async (urlOrKey: string): Promise<void> => {
  const key = urlOrKey.replace(/^\/?uploads\//, '')
  try {
    await unlink(path.join(UPLOAD_ROOT, key))
  } catch {
    // ignore
  }
}
