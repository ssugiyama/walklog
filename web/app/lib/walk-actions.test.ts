import util from "util"
// eslint-disable-next-line @typescript-eslint/no-require-imports
global.TextEncoder = util.TextEncoder
// eslint-disable-next-line @typescript-eslint/no-require-imports
global.TextDecoder = util.TextDecoder
import { sequelize, Walk, Area, SRID } from '@/lib/db/models'
import { Op } from 'sequelize'
import '@testing-library/jest-dom'
import fs from 'fs'
import admin from 'firebase-admin'

jest.mock('firebase-admin', () => {
  return {
    apps: [null],
    initializeApp: jest.fn(),
    auth: jest.fn(() => ({
      verifyIdToken: jest.fn(() => Promise.resolve({ uid: 'testUserId' })),
      listUsers: jest.fn().mockResolvedValue({ users: [1, 2] }),
    })),
  }
})

jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
}))

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

import { revalidateTag } from "next/cache"

const SEARCH_CACHE_TAG = 'searchTag'

jest.mock('sequelize', () => {
  return {
    Op: {
      and: Symbol.for('and'),
      or: Symbol.for('or'),
      in: Symbol.for('in'),
    },
  }
})



jest.mock('next/cache', () => ({
  unstable_cacheTag: jest.fn(),
  revalidateTag: jest.fn(),
}))

// Mock the dependencies
jest.mock('@/lib/db/models', () => {
  return {
    sequelize: {
      where: jest.fn(),
      fn: jest.fn(),
      col: jest.fn(),
      literal: jest.fn(),
    },
    Walk: {
      create: jest.fn(),
      findByPk: jest.fn(),
      findAndCountAll: jest.fn(),
      decodePath: jest.fn(),
      getPathExtent: jest.fn(),
      getStartPoint: jest.fn(),
      getEndPoint: jest.fn(),
    },
    Area: {
      findAll: jest.fn(),
    },
    EARTH_RADIUS: 6371,
    SRID: 4326,
    SRID_FOR_SIMILAR_SEARCH: 3857,
  }
})

jest.mock('nanoid', () => {
  return {
    nanoid: jest.fn(() => 'mocked-nanoid'),
  }
})


describe('searchInternalAction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle date filter properly', async () => {

    // Mock the findAndCountAll response
    (Walk.findAndCountAll as jest.Mock).mockResolvedValue({
      count: 1,
      rows: [{
        asObject: jest.fn().mockReturnValue({ id: 1, title: 'Test Walk' })
      }]
    })

    // Create a props instance using the Map-like interface
    const props = {
      date: '2023-05-15',
    }
    const result = await searchInternalAction(props, 'testUserId')

    // Verify the result
    expect(result.count).toBe(1)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toEqual({ id: 1, title: 'Test Walk' })

    // Verify the query used the correct date filter
    expect(Walk.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          [Symbol.for('and')]: expect.arrayContaining([
            { date: '2023-05-15' },
            expect.objectContaining({
              [Symbol.for('or')]: expect.arrayContaining([
                { uid: "testUserId" },
                { draft: false },
              ])
            })
          ])
        })
      })
    )
  })
  it('should handle user filter properly', async () => {
    // Mock the findAndCountAll response
    (Walk.findAndCountAll as jest.Mock).mockResolvedValue({
      count: 2,
      rows: [
        { asObject: jest.fn().mockReturnValue({ id: 1, title: 'Walk 1', uid: 'user123' }) },
        { asObject: jest.fn().mockReturnValue({ id: 2, title: 'Walk 2', uid: 'user123' }) }
      ]
    })

    // Create a props instance using the Map-like interface
    const props = {
      user: 'user123',
    }
    const result = await searchInternalAction(props, null)

    // Verify the result
    expect(result.count).toBe(2)
    expect(result.rows).toHaveLength(2)

    // Verify the query used the correct user filter
    expect(Walk.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          [Symbol.for('and')]: expect.arrayContaining([
            { uid: 'user123' },
            { draft: false }
          ])
        })
      })
    )
  })

  it('should handle year and month filters properly', async () => {
    sequelize.fn.mockImplementation((fn, ...args) => ({ fn, args }))
    sequelize.col.mockImplementation((col) => ({ col }))
    sequelize.where.mockImplementation((col, val) => ({ col, val }));

    // Mock the findAndCountAll response
    (Walk.findAndCountAll as jest.Mock).mockResolvedValue({
      count: 1,
      rows: [{ asObject: jest.fn().mockReturnValue({ id: 1, title: 'January Walk' }) }]
    })

    const props = {
      year: '2023',
      month: '1',
    }
    const result = await searchInternalAction(props, 'testUserId')

    // Verify the result
    expect(result.count).toBe(1)

    // Verify the sequelize functions were called with correct arguments
    expect(sequelize.fn).toHaveBeenCalledWith('date_part', 'year', expect.anything())
    expect(sequelize.fn).toHaveBeenCalledWith('date_part', 'month', expect.anything())
    expect(sequelize.col).toHaveBeenCalledWith('date')
  })

  // Add more tests for different filter combinations
})

describe('searchAction', () => {
  let prevState
  let props

  beforeEach(() => {
    jest.clearAllMocks()

    prevState = { serial: 0, error: null, idTokenExpired: false, append: false }
    props = { offset: 0, limit: 20 }
  })

  it('should increment the serial number and reset error/idTokenExpired', async () => {
    const mockGetUid = jest.fn().mockResolvedValue(['testUid'])
    const mockSearchInternalAction = jest.fn().mockResolvedValue({ count: 0, rows: [] })

    const result = await searchAction(prevState, props, mockGetUid, mockSearchInternalAction)

    expect(result.serial).toBe(1)
    expect(result.error).toBeNull()
    expect(result.idTokenExpired).toBe(false)
  })

  it('should set append to true if offset is greater than 0', async () => {
    props.offset = 10
    const mockGetUid = jest.fn().mockResolvedValue(['testUid'])
    const mockSearchInternalAction = jest.fn().mockResolvedValue({ count: 0, rows: [] })

    const result = await searchAction(prevState, props, mockGetUid, mockSearchInternalAction)

    expect(result.append).toBe(true)
  })

  it('should call getUid and searchInternalAction with correct arguments', async () => {
    const mockGetUid = jest.fn().mockResolvedValue(['testUid'])
    const mockSearchInternalAction = jest.fn().mockResolvedValue({ count: 0, rows: [] })

    await searchAction(prevState, props, mockGetUid, mockSearchInternalAction)

    expect(mockGetUid).toHaveBeenCalledWith(expect.any(Object))
    expect(mockSearchInternalAction).toHaveBeenCalledWith(props, 'testUid')
  })

  it('should merge the new state returned by searchInternalAction', async () => {
    const mockGetUid = jest.fn().mockResolvedValue(['testUid'])
    const mockSearchInternalAction = jest.fn().mockResolvedValue({ count: 5, rows: [{ id: 1, title: 'Test Walk' }] })

    const result = await searchAction(prevState, props, mockGetUid, mockSearchInternalAction)

    expect(result.count).toBe(5)
    expect(result.rows).toEqual([{ id: 1, title: 'Test Walk' }])
  })

  it('should handle errors gracefully', async () => {
    const mockGetUid = jest.fn().mockRejectedValue(new Error('Failed to get UID'))
    const mockSearchInternalAction = jest.fn().mockResolvedValue({ count: 0, rows: [] })

    await expect(searchAction(prevState, props, mockGetUid, mockSearchInternalAction)).rejects.toThrow('Failed to get UID')
    expect(mockGetUid).toHaveBeenCalledWith(expect.any(Object))
    expect(mockSearchInternalAction).not.toHaveBeenCalled()
  })
})

describe('getItemInternalAction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return an empty state if the walk is a draft and uid does not match', async () => {
    (Walk.findByPk as jest.Mock).mockResolvedValue({
      draft: true,
      uid: 'otherUid',
    })

    const result = await getItemInternalAction(1, 'testUid')

    expect(result).toEqual({})
    expect(Walk.findByPk).toHaveBeenCalledWith(1)
  })

  it('should return the walk object if it is not a draft', async () => {
    const mockWalk = {
      draft: false,
      asObject: jest.fn().mockReturnValue({ id: 1, title: 'Public Walk' }),
    };
    (Walk.findByPk as jest.Mock).mockResolvedValue(mockWalk)

    const result = await getItemInternalAction(1, 'testUid')

    expect(result).toEqual({ current: { id: 1, title: 'Public Walk' } })
    expect(Walk.findByPk).toHaveBeenCalledWith(1)
    expect(mockWalk.asObject).toHaveBeenCalledWith(true)
  })

  it('should return the walk object if it is a draft and uid matches', async () => {
    const mockWalk = {
      draft: true,
      uid: 'testUid',
      asObject: jest.fn().mockReturnValue({ id: 1, title: 'Draft Walk' }),
    };
    (Walk.findByPk as jest.Mock).mockResolvedValue(mockWalk)

    const result = await getItemInternalAction(1, 'testUid')

    expect(result).toEqual({ current: { id: 1, title: 'Draft Walk' } })
    expect(Walk.findByPk).toHaveBeenCalledWith(1)
    expect(mockWalk.asObject).toHaveBeenCalledWith(true)
  })

  it('should return an empty state if the walk does not exist', async () => {
    (Walk.findByPk as jest.Mock).mockResolvedValue(null)

    const result = await getItemInternalAction(1, 'testUid')

    expect(result).toEqual({})
    expect(Walk.findByPk).toHaveBeenCalledWith(1)
  })

  it('should handle errors gracefully', async () => {
    (Walk.findByPk as jest.Mock).mockRejectedValue(new Error('Database error'))

    await expect(getItemInternalAction(1, 'testUid')).rejects.toThrow('Database error')
    expect(Walk.findByPk).toHaveBeenCalledWith(1)
  })
})


describe('getItemAction', () => {
  let prevState

  beforeEach(() => {
    jest.clearAllMocks()

    prevState = { serial: 0, error: null, idTokenExpired: false }
  })

  it('should increment the serial number and reset error/idTokenExpired', async () => {
    const mockGetUid = jest.fn().mockResolvedValue(['testUid'])
    const mockGetItemInternalActionMock = jest.fn().mockResolvedValue({ current: { id: 1, title: 'Test Walk' } })

    const result = await getItemAction(prevState, 1, mockGetUid, mockGetItemInternalActionMock)

    expect(result.serial).toBe(1)
    expect(result.error).toBeNull()
    expect(result.idTokenExpired).toBe(false)
  })

  it('should call getUid and getItemInternalAction with correct arguments', async () => {
    const mockGetUid = jest.fn().mockResolvedValue(['testUid'])
    const mockGetItemInternalActionMock = jest.fn().mockResolvedValue({ current: { id: 1, title: 'Test Walk' } })

    await getItemAction(prevState, 1, mockGetUid, mockGetItemInternalActionMock)

    expect(mockGetUid).toHaveBeenCalledWith(expect.any(Object))
    expect(mockGetItemInternalActionMock).toHaveBeenCalledWith(1, 'testUid')
  })

  it('should merge the new state returned by getItemInternalAction', async () => {
    const mockGetUid = jest.fn().mockResolvedValue(['testUid'])
    const mockGetItemInternalActionMock = jest.fn().mockResolvedValue({ current: { id: 1, title: 'Test Walk' } })

    const result = await getItemAction(prevState, 1, mockGetUid, mockGetItemInternalActionMock)

    expect(result.current).toEqual({ id: 1, title: 'Test Walk' })
  })

  it('should handle errors gracefully', async () => {
    const mockGetUid = jest.fn().mockRejectedValue(new Error('Failed to get UID'))
    const mockGetItemInternalActionMock = jest.fn().mockResolvedValue({})

    await expect(getItemAction(prevState, 1, mockGetUid, mockGetItemInternalActionMock)).rejects.toThrow('Failed to get UID')
    expect(mockGetUid).toHaveBeenCalledWith(expect.any(Object))
    expect(mockGetItemInternalActionMock).not.toHaveBeenCalled()
  })
})

describe('updateItemAction', () => {
  let prevState
  let formData

  beforeEach(() => {
    jest.clearAllMocks()

    prevState = { serial: 0, error: null, id: null, idTokenExpired: false }
    formData = new Map()
  })

  it('should return unauthorized error if uid is null', async () => {
    const mockGetUid = jest.fn().mockResolvedValue([null, false])


    const result = await updateItemAction(prevState, formData, mockGetUid)

    expect(result.error).toBe('unauthorized')
    expect(result.id).toBeNull()
    expect(mockGetUid).toHaveBeenCalledWith(expect.any(Object))
  })

  it('should return forbidden error if user is not admin and openUserMode is false', async () => {
    const mockGetUid = jest.fn().mockResolvedValue(['testUid', false])

    const result = await updateItemAction(prevState, formData, mockGetUid)

    expect(result.error).toBe('forbidden')
    expect(result.id).toBeNull()
    expect(mockGetUid).toHaveBeenCalledWith(expect.any(Object))
  })

  it('should update an existing walk if id is provided', async () => {
    const mockGetUid = jest.fn().mockResolvedValue(['testUid', true])
    const mockUpdate = jest.fn().mockResolvedValue({ id: 1 });
    (Walk.findByPk as jest.Mock) = jest.fn().mockResolvedValue({
      uid: 'testUid',
      update: mockUpdate,
    })

    formData.set('id', '1')
    formData.set('title', 'Updated Walk')
    formData.set('date', '2023-05-15')
    formData.set('draft', 'false')

    const result = await updateItemAction(prevState, formData, mockGetUid)

    expect(result.error).toBeNull()
    expect(result.id).toBe('1')
    expect(Walk.findByPk).toHaveBeenCalledWith('1')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Updated Walk',
        date: '2023-05-15',
        draft: false,
        uid: 'testUid',
      })
    )
    expect(revalidateTag).toHaveBeenCalledWith(SEARCH_CACHE_TAG)
  })

  it('should create a new walk if id is not provided', async () => {
    const mockGetUid = jest.fn().mockResolvedValue(['testUid', true]);

    (Walk.create as jest.Mock) = jest.fn().mockResolvedValue({ id: 2 })

    formData.set('title', 'New Walk')
    formData.set('date', '2023-05-15')
    formData.set('draft', 'true')

    const result = await updateItemAction(prevState, formData, mockGetUid)

    expect(result.error).toBeNull()
    expect(result.id).toBe(2)
    expect(Walk.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Walk',
        date: '2023-05-15',
        draft: true,
        uid: 'testUid',
      })
    )
    expect(revalidateTag).toHaveBeenCalledWith(SEARCH_CACHE_TAG)
  })

  it('should handle image upload and update the walk', async () => {
    const mockGetUid = jest.fn().mockResolvedValue(['testUid', true])
    const mockUpdate = jest.fn().mockResolvedValue({ id: 1 });
    (Walk.findByPk as jest.Mock) = jest.fn().mockResolvedValue({
      uid: 'testUid',
      update: mockUpdate,
    })
    const mockImage = {
      name: 'test-image.jpg',
      size: 1024,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
    }
    formData.set('id', '1')
    formData.set('image', mockImage)

    const result = await updateItemAction(prevState, formData, mockGetUid)

    expect(result.error).toBeNull()
    expect(fs.writeFileSync).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        image: expect.any(String),
      })
    )
  })

  it('should handle errors during update', async () => {
    const mockGetUid = jest.fn().mockResolvedValue(['testUid', true])
    const mockUpdate = jest.fn().mockRejectedValue(new Error('Update failed'));
    (Walk.findByPk as jest.Mock) = jest.fn().mockResolvedValue({
      uid: 'testUid',
      update: mockUpdate,
    })

    formData.set('id', '1')

    const result = await updateItemAction(prevState, formData, mockGetUid)

    expect(result.error).toBe('Update failed')
    expect(result.id).toBeNull()
  })
})

describe('deleteItemAction', () => {
  let prevState

  beforeEach(() => {
    jest.clearAllMocks()
    prevState = { serial: 0, error: null, deleted: false, idTokenExpired: false }
  })

  it('should return unauthorized error if uid is null', async () => {
    const mockGetUid = jest.fn().mockResolvedValue([null, false])
    const result = await deleteItemAction(prevState, 1, mockGetUid)

    expect(result.error).toBe('unauthorized')
    expect(result.deleted).toBe(false)
    expect(mockGetUid).toHaveBeenCalledWith(expect.any(Object))
    expect(Walk.findByPk).not.toHaveBeenCalled()
  })

  it('should return forbidden error if user is not admin and openUserMode is false', async () => {
    const mockGetUid = jest.fn().mockResolvedValue(['testUid', false])

    const result = await deleteItemAction(prevState, 1, mockGetUid)

    expect(result.error).toBe('forbidden')
    expect(result.deleted).toBe(false)
    expect(mockGetUid).toHaveBeenCalledWith(expect.any(Object))
    expect(Walk.findByPk).not.toHaveBeenCalled()
  })

  it('should return not found error if walk does not exist', async () => {
    const mockGetUid = jest.fn().mockResolvedValue(['testUid', true]);
    (Walk.findByPk as jest.Mock) = jest.fn().mockResolvedValue(null)
    const result = await deleteItemAction(prevState, 1, mockGetUid)

    expect(result.error).toBe('not found')
    expect(result.deleted).toBe(false)
    expect(Walk.findByPk).toHaveBeenCalledWith(1)
  })

  it('should return forbidden error if walk.uid does not match uid', async () => {
    const mockGetUid = jest.fn().mockResolvedValue(['testUid', true]);
    (Walk.findByPk as jest.Mock) = jest.fn().mockResolvedValue({ uid: 'otherUid' })

    const result = await deleteItemAction(prevState, 1, mockGetUid)

    expect(result.error).toBe('forbidden')
    expect(result.deleted).toBe(false)
    expect(Walk.findByPk).toHaveBeenCalledWith(1)
  })

  it('should delete the walk and set deleted to true', async () => {
    const mockGetUid = jest.fn().mockResolvedValue(['testUid', true])
    const mockDestroy = jest.fn();
    (Walk.findByPk as jest.Mock) = jest.fn().mockResolvedValue({
      uid: 'testUid',
      destroy: mockDestroy,
    })

    const result = await deleteItemAction(prevState, 1, mockGetUid)

    expect(result.error).toBeNull()
    expect(result.deleted).toBe(true)
    expect(Walk.findByPk).toHaveBeenCalledWith(1)
    expect(mockDestroy).toHaveBeenCalled()
    expect(revalidateTag).toHaveBeenCalledWith(SEARCH_CACHE_TAG)
  })

  it('should handle errors during deletion', async () => {
    const mockGetUid = jest.fn().mockResolvedValue(['testUid', true]);

    (Walk.findByPk as jest.Mock) = jest.fn().mockResolvedValue
      ({
        uid: 'testUid',
        destroy: jest.fn().mockRejectedValue(new Error('Deletion failed')),
      })
    const result = await deleteItemAction(prevState, 1, mockGetUid)

    expect(result.error).toBe('Deletion failed')
    expect(result.deleted).toBe(false)
    expect(Walk.findByPk).toHaveBeenCalledWith(1)
  })
})

describe('getCityAction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return cities based on jcodes', async () => {
    const mockCities = [
      { asObject: jest.fn().mockReturnValue({ jcode: '12345', name: 'City A' }) },
      { asObject: jest.fn().mockReturnValue({ jcode: '67890', name: 'City B' }) },
    ];

    (Area.findAll as jest.Mock).mockResolvedValue(mockCities)

    const params = { jcodes: ['12345', '67890'] }
    const result = await getCityAction(params)

    expect(result).toHaveLength(2)
    expect(result).toEqual([
      { jcode: '12345', name: 'City A' },
      { jcode: '67890', name: 'City B' },
    ])
    expect(Area.findAll).toHaveBeenCalledWith({
      where: { jcode: { [Op.in]: ['12345', '67890'] } },
    })
  })

  it('should return cities based on longitude and latitude', async () => {
    const mockCities = [
      { asObject: jest.fn().mockReturnValue({ jcode: '54321', name: 'City C' }) },
    ];

    (Area.findAll as jest.Mock).mockResolvedValue(mockCities)

    const params = { longitude: 139.6917, latitude: 35.6895 }
    const result = await getCityAction(params)

    expect(result).toHaveLength(1)
    expect(result).toEqual([{ jcode: '54321', name: 'City C' }])
    expect(Area.findAll).toHaveBeenCalledWith({
      where: sequelize.fn(
        'st_contains',
        sequelize.col('the_geom'),
        sequelize.fn(
          'st_setsrid',
          sequelize.fn('st_point', 139.6917, 35.6895),
          SRID
        )
      ),
    })
  })

  it('should return an empty array if no cities are found', async () => {
    (Area.findAll as jest.Mock).mockResolvedValue([])

    const params = { jcodes: ['99999'] }
    const result = await getCityAction(params)

    expect(result).toEqual([])
    expect(Area.findAll).toHaveBeenCalledWith({
      where: { jcode: { [Op.in]: ['99999'] } },
    })
  })

  it('should throw an error if Area.findAll fails', async () => {
    (Area.findAll as jest.Mock).mockRejectedValue(new Error('Database error'))

    const params = { jcodes: ['12345'] }

    await expect(getCityAction(params)).rejects.toThrow('Database error')
    expect(Area.findAll).toHaveBeenCalledWith({
      where: { jcode: { [Op.in]: ['12345'] } },
    })
  })
})

describe('getUsersAction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return a list of users with uid, displayName, and photoURL', async () => {
    const mockUsers = [
      { uid: 'user1', displayName: 'User One', photoURL: 'http://example.com/user1.jpg' },
      { uid: 'user2', displayName: 'User Two', photoURL: 'http://example.com/user2.jpg' },
    ];

    (admin.auth as jest.Mock).mockReturnValue({
      listUsers: jest.fn().mockResolvedValue({ users: mockUsers }),
    })

    const result = await getUsersAction()

    expect(admin.auth().listUsers).toHaveBeenCalledWith(1000)
    expect(result).toHaveLength(2)
    expect(result).toEqual([
      { uid: 'user1', displayName: 'User One', photoURL: 'http://example.com/user1.jpg' },
      { uid: 'user2', displayName: 'User Two', photoURL: 'http://example.com/user2.jpg' },
    ])

  })

  it('should return an empty array if no users are found', async () => {

    (admin.auth().listUsers as jest.Mock).mockResolvedValue({ users: [] })

    const result = await getUsersAction()

    expect(result).toEqual([])
    expect(admin.auth().listUsers).toHaveBeenCalledWith(1000)
  })

  it('should throw an error if listUsers fails', async () => {

    (admin.auth().listUsers as jest.Mock).mockRejectedValue(new Error('Failed to fetch users'))

    await expect(getUsersAction()).rejects.toThrow('Failed to fetch users')
    expect(admin.auth().listUsers).toHaveBeenCalledWith(1000)
  })
})

describe('getConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return the correct configuration object', async () => {
    const mockShapeStyles = { style: 'mockStyle' };
    const mockTheme = { palette: {} };
    const mockFirebaseConfig = { key: 'value' };
    (fs.readFileSync as jest.Mock).mockImplementation((path) => {
      if (path === './default-shape-styles.json') {
        return Buffer.from(JSON.stringify(mockShapeStyles));
      }
      if (path === './default-theme.json') {
        return Buffer.from(JSON.stringify(mockTheme));
      }
      return Buffer.from(JSON.stringify(mockFirebaseConfig));
    });
    const result = await getConfig()

    expect(result).toEqual({
      googleApiKey: process.env.GOOGLE_API_KEY,
      googleApiVersion: process.env.GOOGLE_API_VERSION || 'weekly',
      appVersion: '0.9.0',
      defaultCenter: process.env.DEFAULT_CENTER,
      defaultZoom: 12,
      defaultRadius: 500,
      mapTypeIds: process.env.MAP_TYPE_IDS || 'roadmap,hybrid,satellite,terrain',
      mapId: process.env.MAP_ID,
      firebaseConfig: mockFirebaseConfig,
      theme: mockTheme,
      drawingStyles: mockDrawingStyles,
    })
  })

  it('should throw an error if reading the file fails', async () => {
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('File read error')
    })

    await expect(getConfig()).rejects.toThrow('File read error')
    expect(fs.readFileSync).toHaveBeenCalledWith(process.env.SHAPE_STYLES_JSON || './default-shape-styles.json')
  })
})