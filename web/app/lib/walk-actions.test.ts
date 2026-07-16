import fs from 'fs/promises'
import admin from 'firebase-admin'
import { walks, areas } from '../../lib/drizzle/schema'
import { encode } from '../../lib/utils/path-encoder'
import { sql } from 'drizzle-orm'

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'mocked-nanoid'),
}))

vi.mock('next/cache', () => ({
  cacheTag: vi.fn(),
  unstable_cache: (fn) => fn,
  revalidateTag: vi.fn(),
}))

vi.mock('firebase-admin', () => {
  const mockAdmin = {
    apps: [null],
    initializeApp: vi.fn(),
    auth: vi.fn(() => ({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'testUserId' }),
      listUsers: vi.fn().mockResolvedValue({ users: [1, 2] }),
    })),
  }
  return { default: mockAdmin, ...mockAdmin }
})

vi.mock('fs/promises', () => {
  const mockFs = {
    writeFile: vi.fn(),
    readFile: vi.fn(),
  }
  return { default: mockFs, ...mockFs }
})

// app/lib/walk-actions.ts talks to a real drizzle db instance. Rather than
// mocking every query, swap it for a pglite (in-memory postgres + postgis)
// instance so the actual generated SQL runs against a real database.
vi.mock('../../lib/drizzle/db', async () => {
  const { createTestDb } = await import('../../lib/drizzle/test-db')
  const { db, client } = await createTestDb()
  return { db, client }
})

import { db, client } from '../../lib/drizzle/db'

import {
  searchInternalAction,
  searchAction,
  getItemInternalAction,
  getItemAction,
  getUsersAction,
  getCityAction,
  updateItemAction,
  deleteItemAction,
  getConfig,
} from '@/app/lib/walk-actions'

import { revalidateTag } from 'next/cache'

const SEARCH_CACHE_TAG = 'searchTag'
const DEFAULT_PATH = [[139.767, 35.681], [139.768, 35.682]]

const insertWalk = async (overrides: Partial<{
  date: string
  title: string
  comment: string
  draft: boolean
  uid: string
  path: number[][]
}> = {}) => {
  const now = new Date().toISOString()
  const [row] = await db.insert(walks).values({
    date: overrides.date ?? '2023-05-15',
    title: overrides.title ?? 'Test Walk',
    comment: overrides.comment ?? null,
    draft: overrides.draft ?? false,
    uid: overrides.uid ?? 'testUserId',
    path: overrides.path ?? DEFAULT_PATH,
    createdAt: now,
    updatedAt: now,
  }).returning()
  return row
}

const insertArea = async (jcode: string, wkt: string) => {
  await client.query(
    'INSERT INTO areas (jcode, the_geom) VALUES ($1, ST_GeomFromText($2, 4326))',
    [jcode, wkt],
  )
}

describe('server actions', () => {
  afterAll(async () => {
    await client.close()
  })

  beforeEach(async () => {
    await client.query('TRUNCATE TABLE walks RESTART IDENTITY CASCADE')
    await client.query('TRUNCATE TABLE areas RESTART IDENTITY CASCADE')
    vi.clearAllMocks()
  })

  describe('searchInternalAction', () => {
    it('should handle date filter properly', async () => {
      await insertWalk({ date: '2023-05-15', title: 'Test Walk', uid: 'testUserId' })
      await insertWalk({ date: '2023-06-01', title: 'Other date', uid: 'testUserId' })

      const props = { date: '2023-05-15' }
      const result = await searchInternalAction(props, 'testUserId')

      expect(result.count).toBe(1)
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0]).toEqual(expect.objectContaining({ title: 'Test Walk', date: '2023-05-15' }))
    })

    it('should handle user filter properly', async () => {
      await insertWalk({ uid: 'user123', title: 'Walk 1' })
      await insertWalk({ uid: 'user123', title: 'Walk 2' })
      await insertWalk({ uid: 'someoneElse', title: 'Not mine' })

      const props = { user: 'user123' }
      const result = await searchInternalAction(props, null)

      expect(result.count).toBe(2)
      expect(result.rows).toHaveLength(2)
      expect(result.rows.map((row) => row.title).sort()).toEqual(['Walk 1', 'Walk 2'])
    })

    it('should handle year and month filters properly', async () => {
      await insertWalk({ date: '2023-01-10', title: 'January Walk' })
      await insertWalk({ date: '2023-02-10', title: 'February Walk' })

      const props = { year: '2023', month: '1' }
      const result = await searchInternalAction(props, 'testUserId')

      expect(result.count).toBe(1)
      expect(result.rows[0].title).toBe('January Walk')
    })

    it('should exclude other users\' drafts', async () => {
      await insertWalk({ uid: 'testUserId', draft: false, title: 'Public walk' })
      await insertWalk({ uid: 'otherUser', draft: true, title: 'Someone else\'s draft' })

      const result = await searchInternalAction({}, 'testUserId')

      expect(result.count).toBe(1)
      expect(result.rows[0].title).toBe('Public walk')
    })
  })

  describe('searchAction', () => {
    let prevState
    let props

    beforeEach(() => {
      prevState = { serial: 0, error: null, idTokenExpired: false, append: false }
      props = { offset: 0, limit: 20 }
    })

    it('should increment the serial number and reset error/idTokenExpired', async () => {
      const mockGetUid = vi.fn().mockResolvedValue(['testUid'])
      const mockSearchInternalAction = vi.fn().mockResolvedValue({ count: 0, rows: [] })

      const result = await searchAction(prevState, props, mockGetUid, mockSearchInternalAction)

      expect(result.serial).toBe(1)
      expect(result.idTokenExpired).toBe(false)
    })

    it('should set append to true if offset is greater than 0', async () => {
      props.offset = 10
      const mockGetUid = vi.fn().mockResolvedValue(['testUid'])
      const mockSearchInternalAction = vi.fn().mockResolvedValue({ count: 0, rows: [] })

      const result = await searchAction(prevState, props, mockGetUid, mockSearchInternalAction)

      expect(result.append).toBe(true)
    })

    it('should call getUid and searchInternalAction with correct arguments', async () => {
      const mockGetUid = vi.fn().mockResolvedValue(['testUid'])
      const mockSearchInternalAction = vi.fn().mockResolvedValue({ count: 0, rows: [] })

      await searchAction(prevState, props, mockGetUid, mockSearchInternalAction)

      expect(mockGetUid).toHaveBeenCalledWith(expect.any(Object))
      expect(mockSearchInternalAction).toHaveBeenCalledWith(props, 'testUid')
    })

    it('should merge the new state returned by searchInternalAction', async () => {
      const mockGetUid = vi.fn().mockResolvedValue(['testUid'])
      const mockSearchInternalAction = vi.fn().mockResolvedValue({ count: 5, rows: [{ id: 1, title: 'Test Walk' }] })

      const result = await searchAction(prevState, props, mockGetUid, mockSearchInternalAction)

      expect(result.count).toBe(5)
      expect(result.rows).toEqual([{ id: 1, title: 'Test Walk' }])
    })

    it('should handle errors gracefully', async () => {
      const mockGetUid = vi.fn().mockRejectedValue(new Error('Failed to get UID'))
      const mockSearchInternalAction = vi.fn().mockResolvedValue({ count: 0, rows: [] })

      await expect(searchAction(prevState, props, mockGetUid, mockSearchInternalAction)).rejects.toThrow('Failed to get UID')
      expect(mockGetUid).toHaveBeenCalledWith(expect.any(Object))
      expect(mockSearchInternalAction).not.toHaveBeenCalled()
    })
  })

  describe('getItemInternalAction', () => {
    it('should return an empty state if the walk is a draft and uid does not match', async () => {
      const walk = await insertWalk({ draft: true, uid: 'otherUid' })

      const result = await getItemInternalAction(walk.id, 'testUid')

      expect(result).toEqual({ current: null })
    })

    it('should return the walk object if it is not a draft', async () => {
      const walk = await insertWalk({ draft: false, title: 'Public Walk' })

      const result = await getItemInternalAction(walk.id, 'testUid')

      expect(result.current).toEqual(expect.objectContaining({ id: walk.id, title: 'Public Walk' }))
    })

    it('should return the walk object if it is a draft and uid matches', async () => {
      const walk = await insertWalk({ draft: true, uid: 'testUid', title: 'Draft Walk' })

      const result = await getItemInternalAction(walk.id, 'testUid')

      expect(result.current).toEqual(expect.objectContaining({ id: walk.id, title: 'Draft Walk' }))
    })

    it('should return an empty state if the walk does not exist', async () => {
      const result = await getItemInternalAction(1, 'testUid')

      expect(result).toEqual({})
    })
  })

  describe('getItemAction', () => {
    let prevState

    beforeEach(() => {
      prevState = { serial: 0, error: null, idTokenExpired: false }
    })

    it('should increment the serial number and reset error/idTokenExpired', async () => {
      const mockGetUid = vi.fn().mockResolvedValue(['testUid'])
      const mockGetItemInternalActionMock = vi.fn().mockResolvedValue({ current: { id: 1, title: 'Test Walk' } })

      const result = await getItemAction(prevState, 1, mockGetUid, mockGetItemInternalActionMock)

      expect(result.serial).toBe(1)
      expect(result.idTokenExpired).toBe(false)
    })

    it('should call getUid and getItemInternalAction with correct arguments', async () => {
      const mockGetUid = vi.fn().mockResolvedValue(['testUid'])
      const mockGetItemInternalActionMock = vi.fn().mockResolvedValue({ current: { id: 1, title: 'Test Walk' } })

      await getItemAction(prevState, 1, mockGetUid, mockGetItemInternalActionMock)

      expect(mockGetUid).toHaveBeenCalledWith(expect.any(Object))
      expect(mockGetItemInternalActionMock).toHaveBeenCalledWith(1, 'testUid')
    })

    it('should merge the new state returned by getItemInternalAction', async () => {
      const mockGetUid = vi.fn().mockResolvedValue(['testUid'])
      const mockGetItemInternalActionMock = vi.fn().mockResolvedValue({ current: { id: 1, title: 'Test Walk' } })

      const result = await getItemAction(prevState, 1, mockGetUid, mockGetItemInternalActionMock)

      expect(result.current).toEqual({ id: 1, title: 'Test Walk' })
    })

    it('should handle errors gracefully', async () => {
      const mockGetUid = vi.fn().mockRejectedValue(new Error('Failed to get UID'))
      const mockGetItemInternalActionMock = vi.fn().mockResolvedValue({})

      await expect(getItemAction(prevState, 1, mockGetUid, mockGetItemInternalActionMock)).rejects.toThrow('Failed to get UID')
      expect(mockGetUid).toHaveBeenCalledWith(expect.any(Object))
      expect(mockGetItemInternalActionMock).not.toHaveBeenCalled()
    })
  })

  describe('updateItemAction', () => {
    let prevState
    let formData

    beforeEach(() => {
      prevState = { serial: 0, error: null, id: null, idTokenExpired: false }
      formData = new Map()
    })

    it('should return unauthorized error if uid is null', async () => {
      const mockGetUid = vi.fn().mockResolvedValue([null, false])
      await expect(updateItemAction(prevState, formData, mockGetUid)).rejects.toThrow('unauthorized')
    })

    it('should return forbidden error if user is not admin and openUserMode is false', async () => {
      const mockGetUid = vi.fn().mockResolvedValue(['testUid', false])
      await expect(updateItemAction(prevState, formData, mockGetUid)).rejects.toThrow('forbidden')
    })

    // Zod validation tests
    it('should return validation error if date is missing', async () => {
      const mockGetUid = vi.fn().mockResolvedValue(['testUid', true])

      formData.set('title', 'Test Walk')
      formData.set('path', encode(DEFAULT_PATH))

      const result = await updateItemAction(prevState, formData, mockGetUid)

      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toContain('Date is required')
      expect(result.id).toBeNull()
    })

    it('should return validation error if title is missing', async () => {
      const mockGetUid = vi.fn().mockResolvedValue(['testUid', true])

      formData.set('date', '2023-05-15')
      formData.set('path', encode(DEFAULT_PATH))

      const result = await updateItemAction(prevState, formData, mockGetUid)

      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toContain('Title is required')
      expect(result.id).toBeNull()
    })

    it('should return validation error if path is missing', async () => {
      const mockGetUid = vi.fn().mockResolvedValue(['testUid', true])

      formData.set('date', '2023-05-15')
      formData.set('title', 'Test Walk')

      const result = await updateItemAction(prevState, formData, mockGetUid)

      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toContain('Path is required')
      expect(result.id).toBeNull()
    })

    it('should return validation error if both date and title are missing', async () => {
      const mockGetUid = vi.fn().mockResolvedValue(['testUid', true])

      formData.set('path', encode(DEFAULT_PATH))

      const result = await updateItemAction(prevState, formData, mockGetUid)

      expect(result.error.message).toMatch(/Date is required.*Title is required/)
      expect(result.id).toBeNull()
    })

    it('should return validation error if image is not an image file', async () => {
      const mockGetUid = vi.fn().mockResolvedValue(['testUid', true])
      const mockNonImageFile = {
        name: 'document.pdf',
        size: 1024,
        type: 'application/pdf',
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      }

      formData.set('date', '2023-05-15')
      formData.set('title', 'Test Walk')
      formData.set('path', encode(DEFAULT_PATH))
      formData.set('image', mockNonImageFile)

      const result = await updateItemAction(prevState, formData, mockGetUid)

      expect(result.error.message).toContain('Image must be an image file')
      expect(result.id).toBeNull()
    })

    it('should return validation error if image size exceeds 2MB', async () => {
      const mockGetUid = vi.fn().mockResolvedValue(['testUid', true])
      const mockLargeImageFile = {
        name: 'large-image.jpg',
        size: 3 * 1024 * 1024,
        type: 'image/jpeg',
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(3 * 1024 * 1024)),
      }

      formData.set('date', '2023-05-15')
      formData.set('title', 'Test Walk')
      formData.set('path', encode(DEFAULT_PATH))
      formData.set('image', mockLargeImageFile)

      const result = await updateItemAction(prevState, formData, mockGetUid)

      expect(result.error.message).toContain('Image size must be 2MB or less')
      expect(result.id).toBeNull()
    })

    it('should create a new walk if id is not provided', async () => {
      const mockGetUid = vi.fn().mockResolvedValue(['testUid', true])

      formData.set('title', 'New Walk')
      formData.set('date', '2023-05-15')
      formData.set('path', encode(DEFAULT_PATH))
      formData.set('draft', 'true')

      const result = await updateItemAction(prevState, formData, mockGetUid)

      expect(result.error).toBeNull()
      expect(result.id).toEqual(expect.any(Number))

      const [row] = await db.select().from(walks).where(sql`id = ${result.id}`)
      expect(row).toEqual(expect.objectContaining({ title: 'New Walk', draft: true, uid: 'testUid' }))
      expect(revalidateTag).toHaveBeenCalledWith(SEARCH_CACHE_TAG, 'max')
    })

    it('should update an existing walk if id is provided', async () => {
      const existing = await insertWalk({ uid: 'testUid', title: 'Original title' })
      const mockGetUid = vi.fn().mockResolvedValue(['testUid', true])

      formData.set('id', String(existing.id))
      formData.set('title', 'Updated Walk')
      formData.set('date', '2023-05-15')
      formData.set('path', encode(DEFAULT_PATH))
      formData.set('draft', 'false')

      const result = await updateItemAction(prevState, formData, mockGetUid)

      expect(result.error).toBeNull()
      expect(result.id).toBe(existing.id)

      const [row] = await db.select().from(walks).where(sql`id = ${existing.id}`)
      expect(row).toEqual(expect.objectContaining({ title: 'Updated Walk', draft: false }))
      expect(revalidateTag).toHaveBeenCalledWith(SEARCH_CACHE_TAG, 'max')
    })

    it('should return forbidden error when updating a walk owned by someone else', async () => {
      const existing = await insertWalk({ uid: 'otherUid' })
      const mockGetUid = vi.fn().mockResolvedValue(['testUid', true])

      formData.set('id', String(existing.id))
      formData.set('title', 'Hijacked')
      formData.set('date', '2023-05-15')
      formData.set('path', encode(DEFAULT_PATH))

      await expect(updateItemAction(prevState, formData, mockGetUid)).rejects.toThrow('forbidden')
    })

    it('should handle image upload and update the walk', async () => {
      const existing = await insertWalk({ uid: 'testUid' })
      const mockGetUid = vi.fn().mockResolvedValue(['testUid', true])
      const mockImage = {
        name: 'test-image.jpg',
        size: 1024,
        type: 'image/jpeg',
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      }
      formData.set('id', String(existing.id))
      formData.set('title', 'Test Walk')
      formData.set('date', '2023-05-15')
      formData.set('path', encode(DEFAULT_PATH))
      formData.set('image', mockImage)

      const result = await updateItemAction(prevState, formData, mockGetUid)

      expect(result.error).toBeNull()
      expect(fs.writeFile).toHaveBeenCalled()

      const [row] = await db.select().from(walks).where(sql`id = ${existing.id}`)
      expect(row.image).toEqual(expect.any(String))
    })
  })

  describe('deleteItemAction', () => {
    let prevState

    beforeEach(() => {
      prevState = { serial: 0, error: null, deleted: false, idTokenExpired: false }
    })

    it('should return unauthorized error if uid is null', async () => {
      const mockGetUid = vi.fn().mockResolvedValue([null, false])
      await expect(deleteItemAction(prevState, 1, mockGetUid)).rejects.toThrow('unauthorized')
    })

    it('should return forbidden error if user is not admin and openUserMode is false', async () => {
      const mockGetUid = vi.fn().mockResolvedValue(['testUid', false])
      await expect(deleteItemAction(prevState, 1, mockGetUid)).rejects.toThrow('forbidden')
    })

    it('should return not found error if walk does not exist', async () => {
      const mockGetUid = vi.fn().mockResolvedValue(['testUid', true])
      await expect(deleteItemAction(prevState, 1, mockGetUid)).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    })

    it('should return forbidden error if walk.uid does not match uid', async () => {
      const walk = await insertWalk({ uid: 'otherUid' })
      const mockGetUid = vi.fn().mockResolvedValue(['testUid', true])

      await expect(deleteItemAction(prevState, walk.id, mockGetUid)).rejects.toThrow('forbidden')
    })

    it('should delete the walk and set deleted to true', async () => {
      const walk = await insertWalk({ uid: 'testUid' })
      const mockGetUid = vi.fn().mockResolvedValue(['testUid', true])

      const result = await deleteItemAction(prevState, walk.id, mockGetUid)

      expect(result.deleted).toBe(true)
      expect(revalidateTag).toHaveBeenCalledWith(SEARCH_CACHE_TAG, 'max')

      const remaining = await db.select().from(walks).where(sql`id = ${walk.id}`)
      expect(remaining).toHaveLength(0)
    })

    it('should propagate a database error during deletion', async () => {
      const mockGetUid = vi.fn().mockResolvedValue(['testUid', true])
      // An id outside the int4 range makes postgres itself reject the query,
      // exercising the (intentionally unhandled) error path.
      await expect(deleteItemAction(prevState, 99999999999, mockGetUid)).rejects.toThrow()
    })
  })

  describe('getCityAction', () => {
    it('should return cities based on jcodes', async () => {
      await insertArea('12345', 'MULTIPOLYGON(((139.6 35.6, 139.8 35.6, 139.8 35.8, 139.6 35.8, 139.6 35.6)))')
      await insertArea('67890', 'MULTIPOLYGON(((140.6 36.6, 140.8 36.6, 140.8 36.8, 140.6 36.8, 140.6 36.6)))')

      const params = { jcodes: ['12345', '67890'] }
      const result = await getCityAction(params)

      expect(result).toHaveLength(2)
      expect(result.map((city) => city.jcode).sort()).toEqual(['12345', '67890'])
    })

    it('should return cities based on longitude and latitude', async () => {
      await insertArea('54321', 'MULTIPOLYGON(((139.6 35.6, 139.8 35.6, 139.8 35.8, 139.6 35.8, 139.6 35.6)))')

      const params = { longitude: 139.7, latitude: 35.7 }
      const result = await getCityAction(params)

      expect(result).toHaveLength(1)
      expect(result[0].jcode).toBe('54321')
    })

    it('should return an empty array if no cities are found', async () => {
      const params = { jcodes: ['99999'] }
      const result = await getCityAction(params)

      expect(result).toEqual([])
    })
  })

  describe('getUsersAction', () => {
    it('should return a list of users with uid, displayName, and photoURL', async () => {
      const mockUsers = [
        { uid: 'user1', displayName: 'User One', photoURL: 'http://example.com/user1.jpg' },
        { uid: 'user2', displayName: 'User Two', photoURL: 'http://example.com/user2.jpg' },
      ]
      const listUsers = vi.fn().mockResolvedValue({ users: mockUsers })
      admin.auth.mockReturnValue({ listUsers })

      const result = await getUsersAction()

      expect(listUsers).toHaveBeenCalledWith(1000)
      expect(result).toHaveLength(2)
      expect(result).toEqual([
        { uid: 'user1', displayName: 'User One', photoURL: 'http://example.com/user1.jpg', admin: false },
        { uid: 'user2', displayName: 'User Two', photoURL: 'http://example.com/user2.jpg', admin: false },
      ])
    })

    it('should return an empty array if no users are found', async () => {
      const listUsers = vi.fn().mockResolvedValue({ users: [] })
      admin.auth.mockReturnValue({ listUsers })

      const result = await getUsersAction()

      expect(result).toEqual([])
      expect(listUsers).toHaveBeenCalledWith(1000)
    })

    it('should throw an error if listUsers fails', async () => {
      const listUsers = vi.fn().mockRejectedValue(new Error('Failed to fetch users'))
      admin.auth.mockReturnValue({ listUsers })

      await expect(getUsersAction()).rejects.toThrow('Failed to fetch users')
      expect(listUsers).toHaveBeenCalledWith(1000)
    })
  })

  describe('getConfig', () => {
    it('should return the correct configuration object', async () => {
      const mockShapeStyles = { style: 'mockStyle' }
      const mockTheme = { palette: {} }
      const mockFirebaseConfig = { key: 'value' }
      fs.readFile.mockImplementation(async (path) => {
        if (path === './default-shape-styles.json') {
          return Buffer.from(JSON.stringify(mockShapeStyles))
        }
        if (path === './default-theme.json') {
          return Buffer.from(JSON.stringify(mockTheme))
        }
        return Buffer.from(JSON.stringify(mockFirebaseConfig))
      })
      process.env.APP_VERSION = '1.2.3'
      const result = await getConfig()
      expect(result).toEqual({
        googleApiKey: process.env.GOOGLE_API_KEY,
        googleApiVersion: process.env.GOOGLE_API_VERSION ?? 'weekly',
        openUserMode: false,
        appVersion: '1.2.3',
        defaultCenter: process.env.DEFAULT_CENTER,
        defaultZoom: parseInt(process.env.DEFAULT_ZOOM ?? '12', 10),
        defaultRadius: 500,
        mapTypeIds: process.env.MAP_TYPE_IDS ?? 'roadmap,hybrid,satellite,terrain',
        mapId: process.env.MAP_ID,
        firebaseConfig: expect.any(Object),
        theme: mockTheme,
        shapeStyles: mockShapeStyles,
      })
    })

    it('should throw an error if reading the file fails', async () => {
      fs.readFile.mockRejectedValue(new Error('File read error'))

      await expect(getConfig()).rejects.toThrow('File read error')
    })
  })
})
