vi.mock('./local', () => ({
  saveLocal: vi.fn().mockResolvedValue('/uploads/local.jpg'),
  deleteLocal: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./r2', () => ({
  saveR2: vi.fn().mockResolvedValue('https://pub-test.r2.dev/r2.jpg'),
  deleteR2: vi.fn().mockResolvedValue(undefined),
}))

import { deleteImage, saveImage } from './index'
import { deleteLocal, saveLocal } from './local'
import { deleteR2, saveR2 } from './r2'

const ORIGINAL_ENV = process.env

afterEach(() => {
  process.env = ORIGINAL_ENV
  vi.clearAllMocks()
})

describe('image storage backend selection', () => {
  it('uses the local backend when IMAGE_STORAGE is unset', async () => {
    process.env = { ...ORIGINAL_ENV, IMAGE_STORAGE: undefined }
    const file = new File([], 'x.jpg')

    await saveImage(file, 'x.jpg')
    await deleteImage('/uploads/x.jpg')

    expect(saveLocal).toHaveBeenCalledWith(file, 'x.jpg')
    expect(deleteLocal).toHaveBeenCalledWith('/uploads/x.jpg')
    expect(saveR2).not.toHaveBeenCalled()
    expect(deleteR2).not.toHaveBeenCalled()
  })

  it('uses the local backend for any non-"R2" value', async () => {
    process.env = { ...ORIGINAL_ENV, IMAGE_STORAGE: 'local' }
    const file = new File([], 'x.jpg')

    await saveImage(file, 'x.jpg')

    expect(saveLocal).toHaveBeenCalled()
    expect(saveR2).not.toHaveBeenCalled()
  })

  it('uses the R2 backend when IMAGE_STORAGE is "R2"', async () => {
    process.env = { ...ORIGINAL_ENV, IMAGE_STORAGE: 'R2' }
    const file = new File([], 'x.jpg')

    await saveImage(file, 'x.jpg')
    await deleteImage('https://pub-test.r2.dev/x.jpg')

    expect(saveR2).toHaveBeenCalledWith(file, 'x.jpg')
    expect(deleteR2).toHaveBeenCalledWith('https://pub-test.r2.dev/x.jpg')
    expect(saveLocal).not.toHaveBeenCalled()
    expect(deleteLocal).not.toHaveBeenCalled()
  })
})
