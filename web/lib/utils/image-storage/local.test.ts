import { access, readFile, rm, writeFile } from 'fs/promises'
import path from 'path'
import { deleteLocal, saveLocal } from './local'

const TEST_DIR = 'vitest-local-storage-test'
const TEST_KEY = `${TEST_DIR}/photo.txt`
const TEST_ROOT = path.join(process.cwd(), 'public', 'uploads', TEST_DIR)

describe('local image storage', () => {
  afterEach(async () => {
    await rm(TEST_ROOT, { recursive: true, force: true })
  })

  it('writes the file under public/uploads and returns its public path', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'photo.txt', {
      type: 'text/plain',
    })

    const url = await saveLocal(file, TEST_KEY)

    expect(url).toBe(`/uploads/${TEST_KEY}`)
    const written = await readFile(
      path.join(process.cwd(), 'public', 'uploads', TEST_KEY),
    )
    expect([...written]).toEqual([1, 2, 3])
  })

  it('deletes a previously saved file', async () => {
    const file = new File([new Uint8Array([1])], 'photo.txt')
    await saveLocal(file, TEST_KEY)

    await deleteLocal(`/uploads/${TEST_KEY}`)

    await expect(
      readFile(path.join(process.cwd(), 'public', 'uploads', TEST_KEY)),
    ).rejects.toThrow()
  })

  it('does not throw when deleting a file that does not exist', async () => {
    await expect(
      deleteLocal(`/uploads/${TEST_DIR}/missing.txt`),
    ).resolves.toBeUndefined()
  })

  it('refuses to write outside the upload root', async () => {
    const file = new File([new Uint8Array([1])], 'escape.txt')

    await expect(saveLocal(file, '../escape.txt')).rejects.toThrow(
      'outside the upload directory',
    )
    // A sibling directory sharing the root's name prefix is outside too.
    await expect(saveLocal(file, '../uploads-evil/x.txt')).rejects.toThrow(
      'outside the upload directory',
    )
    await expect(
      access(path.join(process.cwd(), 'public', 'escape.txt')),
    ).rejects.toThrow()
  })

  it('refuses to delete outside the upload root', async () => {
    // A canary next to the upload root, so a broken guard only loses this.
    const canary = path.join(process.cwd(), 'public', `${TEST_DIR}.txt`)
    await writeFile(canary, 'keep')
    try {
      await expect(deleteLocal(`/uploads/../${TEST_DIR}.txt`)).rejects.toThrow(
        'outside the upload directory',
      )
      await expect(access(canary)).resolves.toBeUndefined()
    } finally {
      await rm(canary, { force: true })
    }
  })

  it('uses UPLOAD_DIR as the upload root when set', async () => {
    const dir = path.join(process.cwd(), TEST_DIR, 'custom-root')
    vi.stubEnv('UPLOAD_DIR', dir)
    vi.resetModules()
    try {
      const local = await import('./local')
      const file = new File([new Uint8Array([7])], 'photo.txt')

      const url = await local.saveLocal(file, 'a/photo.txt')

      expect(url).toBe('/uploads/a/photo.txt')
      const written = await readFile(path.join(dir, 'a', 'photo.txt'))
      expect([...written]).toEqual([7])
    } finally {
      vi.unstubAllEnvs()
      await rm(path.join(process.cwd(), TEST_DIR), {
        recursive: true,
        force: true,
      })
    }
  })
})
