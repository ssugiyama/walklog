import {
  and,
  asc,
  desc,
  eq,
  getColumns,
  inArray,
  or,
  SQL,
  sql,
} from 'drizzle-orm'
import moment from 'moment'
import { nanoid } from 'nanoid'
import { cached, type AppCache } from '@/server/cache/types'
import { HttpError } from '@/server/http-error'
import { deleteImage, saveImage } from '@/lib/utils/image-storage'
import { decode } from '@/lib/utils/path-encoder'
import {
  DEFAULT_SEARCH_LIMIT,
  searchPropsSchema,
} from '@/lib/utils/search-params-schema'
import {
  CityParams,
  CityT,
  SearchProps,
  SearchState,
  UserT,
  WalkT,
} from '@/types'
import { getDb } from '../../lib/drizzle/db'
import { areas, coordinatesToWKT, users, walks } from '../../lib/drizzle/schema'
import {
  decodePath,
  EARTH_RADIUS,
  getEndPoint,
  getPathExtent,
  getPoint,
  getStartPoint,
  SRID,
  SRID_FOR_SIMILAR_SEARCH,
} from '../../lib/utils/geo-utils'

type WalkSelectAttributes = typeof walks.$inferSelect & {
  distance?: number
}

type WalkInsertAttributes = typeof walks.$inferInsert
type AreaAttributes = typeof areas.$inferSelect

const asWalkT = (
  walk: WalkSelectAttributes,
  includePath: boolean = false,
): WalkT => {
  return {
    id: walk.id,
    // walks.date is NOT NULL - no null case to handle.
    date: moment(walk.date).format('YYYY-MM-DD'),
    title: walk.title,
    comment: walk.comment ?? undefined,
    draft: walk.draft,
    image: walk.image ?? undefined,
    length: walk.length,
    path: includePath && walk.path ? walk.path : undefined,
    distance: walk.distance,
    uid: walk.uid,
  }
}

const asCityT = (area: AreaAttributes): CityT => {
  return {
    jcode: area.jcode,
    theGeom: area.theGeom,
  }
}

type SearchResult = Pick<SearchState, 'rows' | 'count' | 'offset' | 'error'>

const runSearch = async (
  props: SearchProps,
  uid: string | null,
): Promise<SearchResult> => {
  const state: SearchResult = {
    count: 0,
    rows: [],
  }
  try {
    const parsed = searchPropsSchema.safeParse(props)
    if (!parsed.success) {
      return { ...state, error: parsed.error.issues[0].message }
    }
    const db = await getDb()
    const selectColumns = {
      ...getColumns(walks),
      distance: sql<number>`0 as distance`,
    }
    const orderHash = {
      newest_first: desc(walks.date),
      oldest_first: asc(walks.date),
      longest_first: desc(walks.length),
      shortest_first: asc(walks.length),
      easternmost_first: sql`st_xmax(${walks.path}) desc`,
      westernmost_first: sql`st_xmin(${walks.path}) asc`,
      southernmost_first: sql`st_ymin(${walks.path}) asc`,
      northernmost_first: sql`st_ymax(${walks.path}) desc`,
      nearest_first: sql`distance asc`,
    }

    const where: SQL[] = []
    const order: (typeof orderHash)[keyof typeof orderHash] =
      orderHash[(props.order as keyof typeof orderHash) ?? 'newest_first']

    if (props.date) {
      where.push(eq(walks.date, props.date))
    }
    if (props.user) {
      where.push(eq(walks.uid, props.user))
    }
    if (props.year) {
      where.push(
        sql`EXTRACT(YEAR FROM ${walks.date}) = ${parseInt(props.year, 10)}`,
      )
    }
    if (props.month) {
      where.push(
        sql`EXTRACT(MONTH FROM ${walks.date}) = ${parseInt(props.month, 10)}`,
      )
    }
    if (['neighborhood', 'start', 'end'].includes(props.filter)) {
      const c = props.center.split(/,/)
      const latitude = parseFloat(c[0]) ?? 0
      const longitude = parseFloat(c[1]) ?? 0
      const radius = parseFloat(props.radius)
      const dlat = (radius * 180) / Math.PI / EARTH_RADIUS
      const mlat = latitude > 0 ? latitude + dlat : latitude - dlat
      const dlon = dlat / Math.cos((mlat / 180) * Math.PI)
      const center = getPoint(longitude, latitude)
      const lb = getPoint(longitude - dlon, latitude - dlat)
      const rt = getPoint(longitude + dlon, latitude + dlat)
      let target
      switch (props.filter) {
        case 'neighborhood':
          target = walks.path
          break
        case 'start':
          target = sql`st_startpoint(${walks.path})`
          break
        default:
          target = sql`st_endpoint(${walks.path})`
          break
      }
      where.push(sql`st_makebox2d(${lb}, ${rt}) && ${target}`)
      where.push(sql`st_distance(${target}, ${center}, true) <= ${radius}`)
    } else if (props.filter === 'cities') {
      if (!props.cities) {
        state.count = 0
        state.rows = []
        return state
      }
      const cities = props.cities.split(/,/)
      where.push(
        sql`EXISTS (SELECT * FROM areas WHERE jcode IN ${cities} AND path && the_geom AND ST_Intersects(path, the_geom))`,
      )
    } else if (props.filter === 'crossing') {
      if (!props.path) {
        state.count = 0
        state.rows = []
        return state
      }
      const linestring = decodePath(props.path)
      where.push(sql`${walks.path} && ${linestring}`)
      where.push(sql`ST_Intersects(${walks.path}, ${linestring})`)
    } else if (props.filter === 'hausdorff') {
      if (!props.path) {
        state.count = 0
        state.rows = []
        return state
      }
      const maxDistance = props.max_distance ?? 4000
      const linestring = decodePath(props.path)
      const extent = getPathExtent(props.path)
      const dlat = (maxDistance * 180) / Math.PI / EARTH_RADIUS
      const mlat = Math.max(
        Math.abs(extent.ymax + dlat),
        Math.abs(extent.ymin - dlat),
      )
      const dlon = dlat / Math.cos((mlat / 180) * Math.PI)
      const lb = getPoint(extent.xmin - dlon, extent.ymin - dlat)
      const rt = getPoint(extent.xmax + dlon, extent.ymax + dlat)

      selectColumns.distance = sql<number>`ST_HausdorffDistance(ST_Transform(${walks.path}, ${SRID_FOR_SIMILAR_SEARCH}::integer), ST_Transform(${linestring}, ${SRID_FOR_SIMILAR_SEARCH}::integer))/1000 as distance`
      where.push(
        sql`ST_Within(${walks.path}, ST_SetSRID(ST_MakeBox2d(${lb}, ${rt}), ${SRID}))`,
      )
      where.push(sql`ST_HausdorffDistance(
      ST_Transform(${walks.path}, ${SRID_FOR_SIMILAR_SEARCH}::integer),
      ST_Transform(ST_GeomFromText(${linestring}), ${SRID_FOR_SIMILAR_SEARCH}::integer)
    ) <= ${maxDistance}`)
    } else if (props.filter === 'frechet') {
      if (!props.path) {
        state.count = 0
        state.rows = []
        return state
      }
      const maxDistance = props.max_distance ?? 4000
      const linestring = decodePath(props.path)
      const sp = getStartPoint(props.path)
      const ep = getEndPoint(props.path)
      const dlat = (maxDistance * 180) / Math.PI / EARTH_RADIUS
      const mlat = Math.max(
        Math.abs(sp[1] + dlat),
        Math.abs(sp[1] - dlat),
        Math.abs(ep[1] + dlat),
        Math.abs(ep[1] - dlat),
      )
      const dlon = dlat / Math.cos((mlat / 180) * Math.PI)
      const slb = getPoint(sp[0] - dlon, sp[1] - dlat)
      const srt = getPoint(sp[0] + dlon, sp[1] + dlat)
      const elb = getPoint(ep[0] - dlon, ep[1] - dlat)
      const ert = getPoint(ep[0] + dlon, ep[1] + dlat)

      selectColumns.distance = sql<number>`ST_FrechetDistance(ST_Transform(${walks.path}, ${SRID_FOR_SIMILAR_SEARCH}::integer), ST_Transform(${linestring}, ${SRID_FOR_SIMILAR_SEARCH}::integer))/1000 as distance`
      where.push(
        sql`ST_Within(ST_StartPoint(${walks.path}), ST_SetSRID(ST_MakeBox2d(${slb}, ${srt}), ${SRID}))`,
      )
      where.push(
        sql`ST_Within(ST_EndPoint(${walks.path}), ST_SetSRID(ST_MakeBox2d(${elb}, ${ert}), ${SRID}))`,
      )
      where.push(sql`ST_FrechetDistance(
      ST_Transform(${walks.path}, ${SRID_FOR_SIMILAR_SEARCH}::integer),
      ST_Transform(ST_GeomFromText(${linestring}), ${SRID_FOR_SIMILAR_SEARCH}::integer)
    ) <= ${maxDistance}`)
    }

    if (uid !== null) {
      where.push(or(eq(walks.draft, false), eq(walks.uid, uid)))
    } else {
      where.push(eq(walks.draft, false))
    }

    const limit = parsed.data.limit ?? DEFAULT_SEARCH_LIMIT
    const offset = parsed.data.offset ?? 0

    const condition = and(...where)
    const count = await db.$count(walks, condition)

    state.count = count
    if (offset >= count) {
      state.offset = 0
      state.rows = []
      return state
    }

    const result = await db
      .select(selectColumns)
      .from(walks)
      .where(condition)
      .orderBy(order)
      .limit(limit)
      .offset(offset)

    state.offset = count > offset + limit ? offset + limit : 0
    state.rows = result.map((walk) => asWalkT(walk, true))
    return state
  } catch (error) {
    return { ...state, error: (error as Error).message }
  }
}

class SearchError extends Error {
  constructor(readonly result: SearchResult) {
    super(result.error)
  }
}

export const search = (
  props: SearchProps,
  uid: string | null,
  cache: AppCache,
): Promise<SearchResult> =>
  cached(
    cache,
    {
      key: 'search:' + JSON.stringify([props, uid]),
      tags: ['search'],
      ttlSeconds: 900,
    },
    async () => {
      const result = await runSearch(props, uid)
      // Throw so an error result is not cached; converted back below.
      if (result.error) throw new SearchError(result)
      return result
    },
  ).catch((error) => {
    if (error instanceof SearchError) return error.result
    throw error
  })

// undefined: no such walk, null: someone else's draft.
export const getItem = async (
  id: number,
  uid: string | null,
): Promise<WalkT | null | undefined> => {
  const db = await getDb()
  const walk = await db
    .select()
    .from(walks)
    .where(eq(walks.id, id))
    .limit(1)
    .then((rows) => rows[0])
  if (!walk) {
    return undefined
  }
  return !walk.draft || walk.uid === uid ? asWalkT(walk, true) : null
}

// Manual validation replaces Zod schema for better error message control

// Extension is derived from the MIME type, never from the client file name.
const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
}

type ImageDeps = {
  saveImage: typeof saveImage
  deleteImage: typeof deleteImage
}

export const updateItem = async (
  formData: FormData,
  uid: string | null,
  cache: AppCache,
  deps: ImageDeps = { saveImage, deleteImage },
): Promise<{ id?: number; error?: string }> => {
  const db = await getDb()
  const state: { id?: number; error?: string } = {}
  if (!uid) {
    throw new HttpError(401)
  }

  // Extract form data
  const id = Number(formData.get('id'))
  const date = formData.get('date') as string
  const title = formData.get('title') as string
  const comment = formData.get('comment') as string
  const image = formData.get('image')
  const walkPath = formData.get('path') as string
  const draft = formData.get('draft') === 'true' ? true : false
  const willDeleteImage =
    formData.get('will_delete_image') === 'true' ? true : false

  const decodedPath = walkPath ? decode(walkPath) : undefined
  const hasValidPath = !!decodedPath && decodedPath.length >= 2

  // The client sends the raw file; the upload itself happens here so the
  // storage backend (local disk or R2) stays an implementation detail.
  const newImageFile =
    image instanceof File && image.size > 0 ? image : undefined

  // Manual validation to ensure consistent error messages
  const validationErrors = []

  if (!date || date.trim() === '') {
    validationErrors.push('Date is required')
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    // The date is part of the storage key, so it must not be free-form.
    validationErrors.push('Date is invalid')
  }

  if (!title || title.trim() === '') {
    validationErrors.push('Title is required')
  }

  if (!id && !hasValidPath) {
    validationErrors.push('Path is required')
  }

  if (newImageFile) {
    if (!Object.hasOwn(IMAGE_EXTENSIONS, newImageFile.type)) {
      validationErrors.push('Image must be an image file')
    } else if (newImageFile.size > 2 * 1024 * 1024) {
      validationErrors.push('Image size must be 2MB or less')
    }
  }

  if (validationErrors.length > 0) {
    state.error = validationErrors.join(', ')
    return state
  }

  let existingWalk: WalkSelectAttributes | undefined
  if (id) {
    existingWalk = await db
      .select()
      .from(walks)
      .where(eq(walks.id, id))
      .limit(1)
      .then((rows) => rows[0])
    if (!existingWalk) {
      throw new HttpError(404)
    }
    if (existingWalk.uid !== uid) {
      throw new HttpError(403)
    }
  }

  const d = new Date(date)
  const props: Partial<WalkInsertAttributes> = {
    title,
    comment,
    date: d.toISOString(),
    draft,
    uid,
  }
  if (hasValidPath) {
    props.path = decodedPath
    props.length =
      sql<number>`ST_Length(${coordinatesToWKT(props.path)}, true)/1000` as unknown as number
  }

  let uploadedImage: string | undefined
  if (willDeleteImage) {
    props.image = null
  } else if (newImageFile) {
    const imagePrefix = process.env.IMAGE_PREFIX ?? 'images'
    const ext = IMAGE_EXTENSIONS[newImageFile.type]
    const key = `${imagePrefix}/${uid}-${date}-${nanoid(4)}${ext}`
    try {
      uploadedImage = await deps.saveImage(newImageFile, key)
    } catch (error) {
      console.error('updateItem saveImage error', error)
      state.error = (error as Error).message
      return state
    }
    props.image = uploadedImage
  }

  const oldImage =
    (willDeleteImage || newImageFile) && existingWalk?.image
      ? existingWalk.image
      : null

  if (id) {
    try {
      props.updatedAt = sql<string>`now()` as unknown as string
      await db.update(walks).set(props).where(eq(walks.id, id))
      state.id = id
    } catch (error) {
      console.error('updateItem error', error)
      state.error = (error as Error).message
      state.id = undefined
      if (uploadedImage) {
        void deps.deleteImage(uploadedImage)
      }
      return state
    }
  } else {
    try {
      props.createdAt = sql<string>`now()` as unknown as string
      props.updatedAt = sql<string>`now()` as unknown as string
      const walk = await db
        .insert(walks)
        .values(props as WalkInsertAttributes)
        .returning({ id: walks.id })
        .then((rows) => rows[0])
      state.id = walk?.id
    } catch (error) {
      console.error('updateItem create error', error)
      state.error = (error as Error).message
      state.id = undefined
      if (uploadedImage) {
        void deps.deleteImage(uploadedImage)
      }
      return state
    }
  }

  if (oldImage) {
    void deps.deleteImage(oldImage)
  }

  await cache.bumpTag('search')
  return state
}

export const deleteItem = async (
  id: number,
  uid: string | null,
  cache: AppCache,
): Promise<void> => {
  const db = await getDb()
  if (!uid) {
    throw new HttpError(401)
  }

  const walk = await db
    .select()
    .from(walks)
    .where(eq(walks.id, id))
    .limit(1)
    .then((rows) => rows[0])
  if (!walk) {
    throw new HttpError(404)
  }
  if (walk.uid !== uid) {
    throw new HttpError(403)
  }
  await db.delete(walks).where(eq(walks.id, id))
  await cache.bumpTag('search')
}

export const getCities = (
  params: CityParams,
  cache: AppCache,
): Promise<CityT[]> =>
  cached(
    cache,
    { key: 'cities:' + JSON.stringify(params), ttlSeconds: 900 },
    async () => {
      const db = await getDb()
      let where: SQL
      if (params.jcodes) {
        where = inArray(areas.jcode, params.jcodes)
      } else {
        where = sql`st_contains(${areas.theGeom}, st_setsrid(st_point(${params.longitude}, ${params.latitude}), ${SRID}))`
      }
      return db
        .select()
        .from(areas)
        .where(where)
        .then((rows) => rows.map((area) => asCityT(area)))
    },
  )

export const getUsers = (cache: AppCache): Promise<UserT[]> =>
  cached(cache, { key: 'users', ttlSeconds: 900 }, async () => {
    const db = await getDb()
    const rows = await db.select().from(users).where(eq(users.active, true))
    return rows.map((user) => ({
      uid: user.id,
      displayName: user.name ?? '',
      photoURL: user.image ?? '',
      active: user.active,
    }))
  })
