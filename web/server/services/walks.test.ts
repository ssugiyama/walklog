import { sql } from 'drizzle-orm'
import { users, walks } from '../../lib/drizzle/schema'
import { encode } from '../../lib/utils/path-encoder'

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'mocked-nanoid'),
}))

let mockSession: { user: { id: string; active: boolean } } | null = null
const mockGetSession = vi.fn(async (_args?: unknown) => mockSession)

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(async () => ({ api: { getSession: mockGetSession } })),
}))

// server/services/walks.ts talks to a real drizzle db instance. Rather than
// mocking every query, swap it for a pglite (in-memory postgres + postgis)
// instance so the actual generated SQL runs against a real database.
vi.mock('../../lib/drizzle/db', async () => {
  const { createTestDb } = await import('../../lib/drizzle/test-db')
  const db = await createTestDb()
  return { getDb: async () => db }
})

import { getDb } from '../../lib/drizzle/db'

const db = await getDb()

const client = db.$client as unknown as PGlite

import { PGlite } from '@electric-sql/pglite'

import { memoryCache } from '@/server/cache/memory'
import { getSelfStatus, getUid } from './session'
import {
  deleteItem,
  getCities,
  getItem,
  getUsers,
  search,
  updateItem,
} from './walks'

const noHeaders = new Headers()
const cache = memoryCache()
const DEFAULT_PATH = [
  [139.767, 35.681],
  [139.768, 35.682],
]

const insertWalk = async (
  overrides: Partial<{
    date: string
    title: string
    comment: string
    draft: boolean
    uid: string
    path: number[][]
  }> = {},
) => {
  const now = new Date().toISOString()
  const [row] = await db
    .insert(walks)
    .values({
      date: overrides.date ?? '2023-05-15',
      title: overrides.title ?? 'Test Walk',
      comment: overrides.comment ?? null,
      draft: overrides.draft ?? false,
      uid: overrides.uid ?? 'testUserId',
      path: overrides.path ?? DEFAULT_PATH,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  return row
}

const insertArea = async (jcode: string, wkt: string) => {
  await (client as unknown as PGlite).query(
    'INSERT INTO areas (jcode, the_geom) VALUES ($1, ST_GeomFromText($2, 4326))',
    [jcode, wkt],
  )
}

describe('walk services', () => {
  afterAll(async () => {
    await (client as unknown as PGlite).close()
  })

  beforeEach(async () => {
    await (client as unknown as PGlite).query(
      'TRUNCATE TABLE walks RESTART IDENTITY CASCADE',
    )
    await (client as unknown as PGlite).query(
      'TRUNCATE TABLE areas RESTART IDENTITY CASCADE',
    )
    await (client as unknown as PGlite).query(
      'TRUNCATE TABLE users RESTART IDENTITY CASCADE',
    )
    mockSession = null
    vi.clearAllMocks()
  })

  describe('search', () => {
    it('should handle date filter properly', async () => {
      await insertWalk({
        date: '2023-05-15',
        title: 'Test Walk',
        uid: 'testUserId',
      })
      await insertWalk({
        date: '2023-06-01',
        title: 'Other date',
        uid: 'testUserId',
      })

      const props = { date: '2023-05-15' }
      const result = await search(props, 'testUserId', memoryCache())

      expect(result.count).toBe(1)
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0]).toEqual(
        expect.objectContaining({ title: 'Test Walk', date: '2023-05-15' }),
      )
    })

    it('should handle user filter properly', async () => {
      await insertWalk({ uid: 'user123', title: 'Walk 1' })
      await insertWalk({ uid: 'user123', title: 'Walk 2' })
      await insertWalk({ uid: 'someoneElse', title: 'Not mine' })

      const props = { user: 'user123' }
      const result = await search(props, null, memoryCache())

      expect(result.count).toBe(2)
      expect(result.rows).toHaveLength(2)
      expect(result.rows.map((row) => row.title).sort()).toEqual([
        'Walk 1',
        'Walk 2',
      ])
    })

    it('should handle year and month filters properly', async () => {
      await insertWalk({ date: '2023-01-10', title: 'January Walk' })
      await insertWalk({ date: '2023-02-10', title: 'February Walk' })

      const props = { year: '2023', month: '1' }
      const result = await search(props, 'testUserId', memoryCache())

      expect(result.count).toBe(1)
      expect(result.rows[0].title).toBe('January Walk')
    })

    it("should exclude other users' drafts", async () => {
      await insertWalk({
        uid: 'testUserId',
        draft: false,
        title: 'Public walk',
      })
      await insertWalk({
        uid: 'otherUser',
        draft: true,
        title: "Someone else's draft",
      })

      const result = await search({}, 'testUserId', memoryCache())

      expect(result.count).toBe(1)
      expect(result.rows[0].title).toBe('Public walk')
    })

    it('defaults limit and offset when omitted', async () => {
      await insertWalk({ title: 'Walk 1' })

      const result = await search({}, 'testUserId', memoryCache())

      expect(result.rows).toHaveLength(1)
    })

    it('returns an error instead of silently capping a limit above the maximum', async () => {
      await insertWalk({ title: 'Walk 1' })

      const result = await search({ limit: 500 }, 'testUserId', memoryCache())

      expect(result.error).toMatch(/Invalid limit/)
    })

    it('returns an error instead of silently defaulting a non-numeric or non-positive limit', async () => {
      await insertWalk({ title: 'Walk 1' })

      expect(
        (await search({ limit: NaN }, 'testUserId', memoryCache())).error,
      ).toMatch(/Invalid limit/)
      expect(
        (await search({ limit: 0 }, 'testUserId', memoryCache())).error,
      ).toMatch(/Invalid limit/)
      expect(
        (await search({ limit: -10 }, 'testUserId', memoryCache())).error,
      ).toMatch(/Invalid limit/)
    })

    it('returns an error instead of silently treating a negative offset as 0', async () => {
      await insertWalk({ title: 'Walk 1' })

      const result = await search({ offset: -5 }, 'testUserId', memoryCache())

      expect(result.error).toMatch(/Invalid offset/)
    })

    it('returns an error for an offset above the maximum', async () => {
      await insertWalk({ title: 'Walk 1' })

      const result = await search(
        { offset: 999999999 },
        'testUserId',
        memoryCache(),
      )

      expect(result.error).toMatch(/Invalid offset/)
    })

    it('returns an empty page without querying rows when offset is beyond count', async () => {
      await insertWalk({ title: 'Walk 1' })

      const result = await search({ offset: 5 }, 'testUserId', memoryCache())

      expect(result.count).toBe(1)
      expect(result.rows).toEqual([])
      expect(result.offset).toBe(0)
    })

    it('reflects an update in the next search (search tag bumped)', async () => {
      const cache = memoryCache()
      const before = await search({}, 'testUid', cache)
      const formData = new FormData()
      formData.set('title', 'New Walk')
      formData.set('date', '2023-05-15')
      formData.set('path', encode(DEFAULT_PATH))
      await updateItem(formData, 'testUid', cache)
      const after = await search({}, 'testUid', cache)
      expect(after.count).toBe(before.count + 1)
    })

    it('reflects a delete in the next search (search tag bumped)', async () => {
      const walk = await insertWalk({ uid: 'testUid' })
      const cache = memoryCache()
      const before = await search({}, 'testUid', cache)
      await deleteItem(walk.id, 'testUid', cache)
      const after = await search({}, 'testUid', cache)
      expect(after.count).toBe(before.count - 1)
    })

    it('does not cache an error result', async () => {
      const cache = memoryCache()
      await insertWalk({ title: 'Walk 1' })
      const spy = vi.spyOn(db, 'select').mockImplementationOnce(() => {
        throw new Error('db down')
      })
      const props = { date: '2023-05-15' }
      try {
        const failed = await search(props, 'testUid', cache)
        expect(failed.error).toBe('db down')
      } finally {
        spy.mockRestore()
      }
      const ok = await search(props, 'testUid', cache)
      expect(ok.error).toBeUndefined()
      expect(ok.count).toBe(1)
    })

    it('serves a cached result until the tag is bumped', async () => {
      const cache = memoryCache()
      await insertWalk({ title: 'Walk 1' })
      await search({}, 'testUid', cache)
      await insertWalk({ title: 'Walk 2' })
      expect((await search({}, 'testUid', cache)).count).toBe(1)
      await cache.bumpTag('search')
      expect((await search({}, 'testUid', cache)).count).toBe(2)
    })
  })

  describe('getItem', () => {
    it('returns null if the walk is a draft and uid does not match', async () => {
      const walk = await insertWalk({ draft: true, uid: 'otherUid' })

      expect(await getItem(walk.id, 'testUid')).toBeNull()
    })

    it('returns null for a draft when anonymous', async () => {
      const walk = await insertWalk({ draft: true, uid: 'otherUid' })

      expect(await getItem(walk.id, null)).toBeNull()
    })

    it('should return the walk object if it is not a draft', async () => {
      const walk = await insertWalk({ draft: false, title: 'Public Walk' })

      expect(await getItem(walk.id, 'testUid')).toEqual(
        expect.objectContaining({ id: walk.id, title: 'Public Walk' }),
      )
    })

    it('should return the walk object if it is a draft and uid matches', async () => {
      const walk = await insertWalk({
        draft: true,
        uid: 'testUid',
        title: 'Draft Walk',
      })

      expect(await getItem(walk.id, 'testUid')).toEqual(
        expect.objectContaining({ id: walk.id, title: 'Draft Walk' }),
      )
    })

    it('returns undefined if the walk does not exist', async () => {
      expect(await getItem(1, 'testUid')).toBeUndefined()
    })
  })

  describe('updateItem', () => {
    let formData: FormData

    beforeEach(() => {
      formData = new FormData()
    })

    it('throws 401 if uid is null', async () => {
      await expect(updateItem(formData, null, cache)).rejects.toMatchObject({
        status: 401,
      })
    })

    it('throws 404 if the target walk does not exist', async () => {
      formData.set('id', '999')
      formData.set('title', 'x')
      formData.set('date', '2023-05-15')
      await expect(
        updateItem(formData, 'testUid', cache),
      ).rejects.toMatchObject({ status: 404 })
    })

    // Zod validation tests
    it('should return validation error if date is missing', async () => {
      formData.set('title', 'Test Walk')
      formData.set('path', encode(DEFAULT_PATH))

      const result = await updateItem(formData, 'testUid', cache)

      expect(typeof result.error).toBe('string')
      expect(result.error).toContain('Date is required')
      expect(result.id).toBeUndefined()
    })

    it('should return validation error if title is missing', async () => {
      formData.set('date', '2023-05-15')
      formData.set('path', encode(DEFAULT_PATH))

      const result = await updateItem(formData, 'testUid', cache)

      expect(typeof result.error).toBe('string')
      expect(result.error).toContain('Title is required')
      expect(result.id).toBeUndefined()
    })

    it('should return validation error if path is missing', async () => {
      formData.set('date', '2023-05-15')
      formData.set('title', 'Test Walk')

      const result = await updateItem(formData, 'testUid', cache)

      expect(typeof result.error).toBe('string')
      expect(result.error).toContain('Path is required')
      expect(result.id).toBeUndefined()
    })

    it('should return validation error if both date and title are missing', async () => {
      formData.set('path', encode(DEFAULT_PATH))

      const result = await updateItem(formData, 'testUid', cache)

      expect(result.error).toMatch(/Date is required.*Title is required/)
      expect(result.id).toBeUndefined()
    })

    it('should create a new walk if id is not provided', async () => {
      formData.set('title', 'New Walk')
      formData.set('date', '2023-05-15')
      formData.set('path', encode(DEFAULT_PATH))
      formData.set('draft', 'true')

      const result = await updateItem(formData, 'testUid', cache)

      expect(result.error).toBeUndefined()
      expect(result.id).toEqual(expect.any(Number))

      const [row] = await db
        .select()
        .from(walks)
        .where(sql`id = ${result.id}`)
      expect(row).toEqual(
        expect.objectContaining({
          title: 'New Walk',
          draft: true,
          uid: 'testUid',
        }),
      )
    })

    it('should update an existing walk if id is provided', async () => {
      const existing = await insertWalk({
        uid: 'testUid',
        title: 'Original title',
      })

      formData.set('id', String(existing.id))
      formData.set('title', 'Updated Walk')
      formData.set('date', '2023-05-15')
      formData.set('path', encode(DEFAULT_PATH))
      formData.set('draft', 'false')

      const result = await updateItem(formData, 'testUid', cache)

      expect(result.error).toBeUndefined()
      expect(result.id).toBe(existing.id)

      const [row] = await db
        .select()
        .from(walks)
        .where(sql`id = ${existing.id}`)
      expect(row).toEqual(
        expect.objectContaining({ title: 'Updated Walk', draft: false }),
      )
    })

    it('should update an existing walk without changing its path when path is omitted', async () => {
      const existing = await insertWalk({
        uid: 'testUid',
        title: 'Original title',
      })

      formData.set('id', String(existing.id))
      formData.set('title', 'Updated Walk')
      formData.set('date', '2023-05-15')
      formData.set('draft', 'false')

      const result = await updateItem(formData, 'testUid', cache)

      expect(result.error).toBeUndefined()
      expect(result.id).toBe(existing.id)

      const [row] = await db
        .select()
        .from(walks)
        .where(sql`id = ${existing.id}`)
      expect(row).toEqual(
        expect.objectContaining({ title: 'Updated Walk', draft: false }),
      )
      expect(row.path).toEqual(existing.path)
    })

    it('should update an existing walk without changing its path when path decodes to fewer than two points', async () => {
      const existing = await insertWalk({
        uid: 'testUid',
        title: 'Original title',
      })

      formData.set('id', String(existing.id))
      formData.set('title', 'Updated Walk')
      formData.set('date', '2023-05-15')
      formData.set('draft', 'false')
      // A single point (or a mangled string decoding to one) isn't a valid
      // LINESTRING - reproduces the production crash where a degenerate
      // `path` value was accepted, then failed at the DB with an empty
      // `SRID=4326;LINESTRING()`.
      formData.set('path', encode([DEFAULT_PATH[0]]))

      const result = await updateItem(formData, 'testUid', cache)

      expect(result.error).toBeUndefined()
      expect(result.id).toBe(existing.id)

      const [row] = await db
        .select()
        .from(walks)
        .where(sql`id = ${existing.id}`)
      expect(row).toEqual(
        expect.objectContaining({ title: 'Updated Walk', draft: false }),
      )
      expect(row.path).toEqual(existing.path)
    })

    it('should return validation error if path decodes to fewer than two points on create', async () => {
      formData.set('title', 'New Walk')
      formData.set('date', '2023-05-15')
      formData.set('path', encode([DEFAULT_PATH[0]]))

      const result = await updateItem(formData, 'testUid', cache)

      expect(typeof result.error).toBe('string')
      expect(result.error).toContain('Path is required')
      expect(result.id).toBeUndefined()
    })

    it('throws 403 when updating a walk owned by someone else', async () => {
      const existing = await insertWalk({ uid: 'otherUid' })

      formData.set('id', String(existing.id))
      formData.set('title', 'Hijacked')
      formData.set('date', '2023-05-15')
      formData.set('path', encode(DEFAULT_PATH))

      await expect(
        updateItem(formData, 'testUid', cache),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('should upload a new image file and store the returned URL', async () => {
      const existing = await insertWalk({ uid: 'testUid' })
      const uploadedUrl = '/uploads/images/testUid-2023-05-15-mocked-nanoid.jpg'
      const mockSaveImage = vi.fn().mockResolvedValue(uploadedUrl)
      const mockDeleteImage = vi.fn().mockResolvedValue(undefined)
      const file = new File([new Uint8Array([1, 2, 3])], 'test.jpg', {
        type: 'image/jpeg',
      })
      formData.set('id', String(existing.id))
      formData.set('title', 'Test Walk')
      formData.set('date', '2023-05-15')
      formData.set('path', encode(DEFAULT_PATH))
      formData.set('image', file)

      const result = await updateItem(formData, 'testUid', cache, {
        saveImage: mockSaveImage,
        deleteImage: mockDeleteImage,
      })

      expect(result.error).toBeUndefined()
      expect(mockSaveImage).toHaveBeenCalledWith(
        file,
        expect.stringContaining('testUid-2023-05-15-mocked-nanoid'),
      )

      const [row] = await db
        .select()
        .from(walks)
        .where(sql`id = ${existing.id}`)
      expect(row.image).toBe(uploadedUrl)
    })

    it('should delete the previous image once a replacement save succeeds', async () => {
      const oldUrl = '/uploads/images/old.jpg'
      const existing = await insertWalk({ uid: 'testUid' })
      await db
        .update(walks)
        .set({ image: oldUrl })
        .where(sql`id = ${existing.id}`)
      const uploadedUrl = '/uploads/images/new.jpg'
      const mockSaveImage = vi.fn().mockResolvedValue(uploadedUrl)
      const mockDeleteImage = vi.fn().mockResolvedValue(undefined)
      const file = new File([new Uint8Array([1, 2, 3])], 'test.jpg', {
        type: 'image/jpeg',
      })
      formData.set('id', String(existing.id))
      formData.set('title', 'Test Walk')
      formData.set('date', '2023-05-15')
      formData.set('path', encode(DEFAULT_PATH))
      formData.set('image', file)

      const result = await updateItem(formData, 'testUid', cache, {
        saveImage: mockSaveImage,
        deleteImage: mockDeleteImage,
      })

      expect(result.error).toBeUndefined()
      expect(mockDeleteImage).toHaveBeenCalledWith(oldUrl)
    })

    it('should clean up the newly uploaded image if the db update fails', async () => {
      const existing = await insertWalk({ uid: 'testUid' })
      const uploadedUrl = '/uploads/images/new.jpg'
      const mockSaveImage = vi.fn().mockResolvedValue(uploadedUrl)
      const mockDeleteImage = vi.fn().mockResolvedValue(undefined)
      const file = new File([new Uint8Array([1, 2, 3])], 'test.jpg', {
        type: 'image/jpeg',
      })
      formData.set('id', String(existing.id))
      formData.set('title', 'Test Walk')
      formData.set('date', '2023-05-15')
      formData.set('path', encode(DEFAULT_PATH))
      formData.set('image', file)

      const updateSpy = vi.spyOn(db, 'update').mockReturnValueOnce({
        set: () => ({
          where: () => Promise.reject(new Error('db update failed')),
        }),
      } as unknown as ReturnType<typeof db.update>)

      try {
        const result = await updateItem(formData, 'testUid', cache, {
          saveImage: mockSaveImage,
          deleteImage: mockDeleteImage,
        })

        expect(typeof result.error).toBe('string')
        expect(mockSaveImage).toHaveBeenCalled()
        expect(mockDeleteImage).toHaveBeenCalledWith(uploadedUrl)
      } finally {
        updateSpy.mockRestore()
      }
    })

    it('should reject a non-image file', async () => {
      const existing = await insertWalk({ uid: 'testUid' })
      const file = new File(['x'], 'document.pdf', {
        type: 'application/pdf',
      })
      formData.set('id', String(existing.id))
      formData.set('title', 'Test Walk')
      formData.set('date', '2023-05-15')
      formData.set('path', encode(DEFAULT_PATH))
      formData.set('image', file)

      const result = await updateItem(formData, 'testUid', cache)

      expect(typeof result.error).toBe('string')
      expect(result.error).toContain('Image must be an image file')
    })

    it('rejects a traversal date and does not save the image', async () => {
      const mockSaveImage = vi.fn()
      const file = new File([new Uint8Array([1])], 'a.jpg', {
        type: 'image/jpeg',
      })
      formData.set('title', 'Test Walk')
      formData.set('date', '../../x')
      formData.set('path', encode(DEFAULT_PATH))
      formData.set('image', file)

      const result = await updateItem(formData, 'testUid', cache, {
        saveImage: mockSaveImage,
        deleteImage: vi.fn(),
      })

      expect(result.error).toContain('Date is invalid')
      expect(mockSaveImage).not.toHaveBeenCalled()
    })

    it('rejects an svg image', async () => {
      const mockSaveImage = vi.fn()
      const file = new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' })
      formData.set('title', 'Test Walk')
      formData.set('date', '2023-05-15')
      formData.set('path', encode(DEFAULT_PATH))
      formData.set('image', file)

      const result = await updateItem(formData, 'testUid', cache, {
        saveImage: mockSaveImage,
        deleteImage: vi.fn(),
      })

      expect(result.error).toContain('Image must be an image file')
      expect(mockSaveImage).not.toHaveBeenCalled()
    })

    it('derives the key extension from the MIME type, not the file name', async () => {
      const mockSaveImage = vi.fn().mockResolvedValue('/uploads/x.png')
      const file = new File([new Uint8Array([1])], 'x.html', {
        type: 'image/png',
      })
      formData.set('title', 'Test Walk')
      formData.set('date', '2023-05-15')
      formData.set('path', encode(DEFAULT_PATH))
      formData.set('image', file)

      await updateItem(formData, 'testUid', cache, {
        saveImage: mockSaveImage,
        deleteImage: vi.fn(),
      })

      expect(mockSaveImage).toHaveBeenCalledWith(
        file,
        expect.stringMatching(/\/testUid-2023-05-15-mocked-nanoid\.png$/),
      )
    })

    it('should reject an image over 2MB', async () => {
      const existing = await insertWalk({ uid: 'testUid' })
      const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.jpg', {
        type: 'image/jpeg',
      })
      formData.set('id', String(existing.id))
      formData.set('title', 'Test Walk')
      formData.set('date', '2023-05-15')
      formData.set('path', encode(DEFAULT_PATH))
      formData.set('image', file)

      const result = await updateItem(formData, 'testUid', cache)

      expect(typeof result.error).toBe('string')
      expect(result.error).toContain('Image size must be 2MB or less')
    })

    it('should clear the image when will_delete_image is true', async () => {
      const oldUrl = '/uploads/images/old.jpg'
      const existing = await insertWalk({ uid: 'testUid' })
      await db
        .update(walks)
        .set({ image: oldUrl })
        .where(sql`id = ${existing.id}`)
      const mockDeleteImage = vi.fn().mockResolvedValue(undefined)
      formData.set('id', String(existing.id))
      formData.set('title', 'Test Walk')
      formData.set('date', '2023-05-15')
      formData.set('path', encode(DEFAULT_PATH))
      formData.set('will_delete_image', 'true')

      const result = await updateItem(formData, 'testUid', cache, {
        saveImage: vi.fn(),
        deleteImage: mockDeleteImage,
      })

      expect(result.error).toBeUndefined()

      const [row] = await db
        .select()
        .from(walks)
        .where(sql`id = ${existing.id}`)
      expect(row.image).toBeNull()
      expect(mockDeleteImage).toHaveBeenCalledWith(oldUrl)
    })
  })

  describe('deleteItem', () => {
    it('throws 401 if uid is null', async () => {
      await expect(deleteItem(1, null, cache)).rejects.toMatchObject({
        status: 401,
      })
    })

    it('throws 404 if walk does not exist', async () => {
      await expect(deleteItem(1, 'testUid', cache)).rejects.toMatchObject({
        status: 404,
      })
    })

    it('throws 403 if walk.uid does not match uid', async () => {
      const walk = await insertWalk({ uid: 'otherUid' })

      await expect(deleteItem(walk.id, 'testUid', cache)).rejects.toMatchObject(
        { status: 403 },
      )
    })

    it('should delete the walk', async () => {
      const walk = await insertWalk({ uid: 'testUid' })

      await deleteItem(walk.id, 'testUid', cache)

      const remaining = await db
        .select()
        .from(walks)
        .where(sql`id = ${walk.id}`)
      expect(remaining).toHaveLength(0)
    })

    it('should propagate a database error during deletion', async () => {
      // An id outside the int4 range makes postgres itself reject the query,
      // exercising the (intentionally unhandled) error path.
      await expect(deleteItem(99999999999, 'testUid', cache)).rejects.toThrow()
    })
  })

  describe('getCities', () => {
    it('should return cities based on jcodes', async () => {
      await insertArea(
        '12345',
        'MULTIPOLYGON(((139.6 35.6, 139.8 35.6, 139.8 35.8, 139.6 35.8, 139.6 35.6)))',
      )
      await insertArea(
        '67890',
        'MULTIPOLYGON(((140.6 36.6, 140.8 36.6, 140.8 36.8, 140.6 36.8, 140.6 36.6)))',
      )

      const params = { jcodes: ['12345', '67890'] }
      const result = await getCities(params, memoryCache())

      expect(result).toHaveLength(2)
      expect(result.map((city) => city.jcode).sort()).toEqual([
        '12345',
        '67890',
      ])
    })

    it('should return cities based on longitude and latitude', async () => {
      await insertArea(
        '54321',
        'MULTIPOLYGON(((139.6 35.6, 139.8 35.6, 139.8 35.8, 139.6 35.8, 139.6 35.6)))',
      )

      const params = { longitude: 139.7, latitude: 35.7 }
      const result = await getCities(params, memoryCache())

      expect(result).toHaveLength(1)
      expect(result[0].jcode).toBe('54321')
    })

    it('should return an empty array if no cities are found', async () => {
      const params = { jcodes: ['99999'] }
      const result = await getCities(params, memoryCache())

      expect(result).toEqual([])
    })
  })

  describe('getUsers', () => {
    it('should return only active users with uid, displayName, and photoURL', async () => {
      await db.insert(users).values([
        {
          id: 'user1',
          name: 'User One',
          image: 'http://example.com/user1.jpg',
          active: true,
        },
        {
          id: 'user2',
          name: 'Pending User',
          image: 'http://example.com/user2.jpg',
          active: false,
        },
      ])

      const result = await getUsers(memoryCache())

      expect(result).toEqual([
        {
          uid: 'user1',
          displayName: 'User One',
          photoURL: 'http://example.com/user1.jpg',
          active: true,
        },
      ])
    })

    it('should return an empty array if no active users exist', async () => {
      const result = await getUsers(memoryCache())

      expect(result).toEqual([])
    })
  })

  describe('registration gate (getSelfStatus / updateItem)', () => {
    const post = async (headers: Headers) => {
      const formData = new FormData()
      formData.set('date', '2023-05-15')
      formData.set('title', 'Test Walk')
      formData.set('path', encode(DEFAULT_PATH))
      return updateItem(formData, await getUid(headers), cache)
    }

    it('getSelfStatus returns anonymous when there is no session', async () => {
      mockSession = null

      expect(await getSelfStatus(noHeaders)).toBe('anonymous')
    })

    it('getSelfStatus returns anonymous instead of throwing when getSession fails', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockGetSession.mockRejectedValueOnce(new Error('db down'))

      try {
        expect(await getSelfStatus(noHeaders)).toBe('anonymous')
      } finally {
        errorSpy.mockRestore()
      }
    })

    it('passes the request headers to getSession', async () => {
      const headers = new Headers({ cookie: 'a=b' })

      await getSelfStatus(headers)

      expect(mockGetSession).toHaveBeenCalledWith({ headers })
    })

    it('reports pending for a signed-in user who is not active', async () => {
      mockSession = { user: { id: 'testUserId', active: false } }

      expect(await getSelfStatus(noHeaders)).toBe('pending')
    })

    it('reports active for an active user', async () => {
      mockSession = { user: { id: 'testUserId', active: true } }

      expect(await getSelfStatus(noHeaders)).toBe('active')
    })

    it('denies posting without a session', async () => {
      mockSession = null

      await expect(post(noHeaders)).rejects.toMatchObject({ status: 401 })
    })

    it('denies posting for a pending user', async () => {
      mockSession = { user: { id: 'testUserId', active: false } }

      await expect(post(noHeaders)).rejects.toMatchObject({ status: 401 })
    })

    it('allows posting for an active user', async () => {
      mockSession = { user: { id: 'testUserId', active: true } }

      const result = await post(noHeaders)

      expect(result.error).toBeUndefined()
      expect(result.id).toEqual(expect.any(Number))
    })
  })
})
