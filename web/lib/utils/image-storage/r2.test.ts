import { deleteR2, saveR2 } from './r2'

const ORIGINAL_ENV = process.env

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    R2_ACCOUNT_ID: 'test-account',
    R2_ACCESS_KEY_ID: 'test-key',
    R2_SECRET_ACCESS_KEY: 'test-secret',
    R2_BUCKET_NAME: 'test-bucket',
    R2_PUBLIC_URL: 'https://pub-test.r2.dev',
  }
})

afterEach(() => {
  process.env = ORIGINAL_ENV
  vi.unstubAllGlobals()
})

describe('r2 image storage', () => {
  it('PUTs the file to the R2 object endpoint and returns its public URL', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)
    const file = new File([new Uint8Array([1, 2, 3])], 'photo.jpg', {
      type: 'image/jpeg',
    })

    const url = await saveR2(file, 'images/photo.jpg')

    expect(url).toBe('https://pub-test.r2.dev/images/photo.jpg')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [request] = mockFetch.mock.calls[0]
    expect(request.method).toBe('PUT')
    expect(request.url).toBe(
      'https://test-account.r2.cloudflarestorage.com/test-bucket/images/photo.jpg',
    )
  })

  it('throws when the upload response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(null, { status: 403, statusText: 'Forbidden' }),
        ),
    )
    const file = new File([new Uint8Array([1])], 'photo.jpg', {
      type: 'image/jpeg',
    })

    await expect(saveR2(file, 'images/photo.jpg')).rejects.toThrow(
      'Failed to upload to R2',
    )
  })

  it('DELETEs the object derived from a public URL', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', mockFetch)

    await deleteR2('https://pub-test.r2.dev/images/photo.jpg')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [request] = mockFetch.mock.calls[0]
    expect(request.method).toBe('DELETE')
    expect(request.url).toBe(
      'https://test-account.r2.cloudflarestorage.com/test-bucket/images/photo.jpg',
    )
  })

  it('does not throw when the delete request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    await expect(
      deleteR2('https://pub-test.r2.dev/images/photo.jpg'),
    ).resolves.toBeUndefined()
  })
})
