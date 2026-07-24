import { readFile, rm } from 'fs/promises'
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
})
