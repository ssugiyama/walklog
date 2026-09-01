'use server'

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
import { cacheTag, revalidateTag } from 'next/cache'
import { ValueOf } from 'next/dist/shared/lib/constants'
import { cookies } from 'next/headers'
import { forbidden, notFound, unauthorized } from 'next/navigation'
import {
  FirebaseIdTokenClaims,
  IdTokenExpiredError,
  verifyFirebaseIdToken,
} from '@/lib/utils/firebase-id-token'
import { deleteImage, saveImage } from '@/lib/utils/image-storage'
import { decode } from '@/lib/utils/path-encoder'
import {
  BaseState,
  CityParams,
  CityT,
  DeleteItemState,
  GetItemState,
  SearchProps,
  SearchState,
  SelfStatusT,
  UpdateItemState,
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
    date: walk.date ? moment(walk.date).format('YYYY-MM-DD') : null,
    title: walk.title,
    comment: walk.comment,
    draft: walk.draft,
    image: walk.image,
    length: walk.length,
    path: includePath && walk.path ? walk.path : null,
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

const SEARCH_CACHE_TAG = 'searchTag'

const autoApproveUsers: boolean = !!process.env.AUTO_APPROVE_USERS

type UserRow = typeof users.$inferSelect

// Not exported: takes a verified token claim, so it must never be reachable
// as a server action directly from the client.
const getOrCreateUser = async (
  claim: FirebaseIdTokenClaims,
): Promise<UserRow> => {
  const db = await getDb()
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.uid, claim.uid))
    .limit(1)
    .then((rows) => rows[0])
  if (existing) return existing
  const created = await db
    .insert(users)
    .values({
      uid: claim.uid,
      email: claim.email ?? null,
      displayName: claim.name ?? null,
      photoURL: claim.picture ?? null,
      active: autoApproveUsers,
    })
    .onConflictDoNothing()
    .returning()
    .then((rows) => rows[0])
  return (
    created ??
    (await db
      .select()
      .from(users)
      .where(eq(users.uid, claim.uid))
      .limit(1)
      .then((rows) => rows[0]))
  )
}

const verifyIdToken = async (
  state: BaseState,
): Promise<FirebaseIdTokenClaims | null> => {
  const cookieStore = await cookies()
  state.idTokenExpired = false
  const idToken = cookieStore.get('idToken')
  if (!idToken?.value) {
    return null
  }
  try {
    return await verifyFirebaseIdToken(idToken.value)
  } catch (error) {
    if (error instanceof IdTokenExpiredError) {
      state.idTokenExpired = true
    } else {
      state.error = error as Error
    }
    return null
  }
}

const getUid = async (state: BaseState): Promise<string | null> => {
  const claim = await verifyIdToken(state)
  if (!claim) {
    return null
  }
  const user = await getOrCreateUser(claim)
  if (!user.active) {
    return null
  }
  return claim.uid
}

export const getSelfStatusAction = async (): Promise<SelfStatusT> => {
  const claim = await verifyIdToken({})
  if (!claim) {
    return 'anonymous'
  }
  const user = await getOrCreateUser(claim)
  return user.active ? 'active' : 'pending'
}

// A little under Firebase's 1-hour token lifetime, so the cookie never
// outlives the token it holds.
const ID_TOKEN_COOKIE_MAX_AGE = 55 * 60

export const setIdTokenAction = async (
  idToken: string,
): Promise<{ error: boolean }> => {
  try {
    await verifyFirebaseIdToken(idToken)
  } catch {
    return { error: true }
  }
  const cookieStore = await cookies()
  cookieStore.set('idToken', idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ID_TOKEN_COOKIE_MAX_AGE,
  })
  return { error: false }
}

export const clearIdTokenAction = async (): Promise<void> => {
  const cookieStore = await cookies()
  cookieStore.delete('idToken')
}

export const searchInternalAction = async (
  props: SearchProps,
  uid: string,
): Promise<SearchState> => {
  'use cache'
  cacheTag(SEARCH_CACHE_TAG)
  const db = await getDb()
  const selectColumns = {
    ...getColumns(walks),
    distance: sql<number>`0 as distance`,
  }
  const state: SearchState = {
    count: 0,
    rows: [],
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
  const order: ValueOf<typeof orderHash> =
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

  const limit = props.limit ?? 20
  const offset = props.offset ?? 0

  const condition = and(...where)
  const result = await db
    .select(selectColumns)
    .from(walks)
    .where(condition)
    .orderBy(order)
    .limit(limit)
    .offset(offset)
  const count = await db.$count(walks, condition)

  state.count = count
  state.offset = count > offset + limit ? offset + limit : 0
  state.rows = result.map((walk) => asWalkT(walk, true))
  return state
}

export const searchAction = async (
  prevState: SearchState,
  props: SearchProps,
  _getUid = getUid,
  _searchInternalAction = searchInternalAction,
): Promise<typeof prevState> => {
  const state = { ...prevState }
  state.serial++
  state.idTokenExpired = false
  state.append = props.offset > 0

  const uid = await _getUid(state)
  const newState = await _searchInternalAction(props, uid)
  return Object.assign({ ...state }, newState)
}

export const getItemInternalAction = async (
  id: number,
  uid: string,
): Promise<GetItemState> => {
  'use cache'
  cacheTag(SEARCH_CACHE_TAG)
  const db = await getDb()
  const state: GetItemState = {}

  const walk = await db
    .select()
    .from(walks)
    .where(eq(walks.id, id))
    .limit(1)
    .then((rows) => rows[0])
  if (!walk) {
    return state
  }

  state.current = !walk.draft || walk.uid === uid ? asWalkT(walk, true) : null
  return state
}

export const getItemAction = async (
  prevState: GetItemState,
  id: number,
  _getUid = getUid,
  _getItemInternalAction = getItemInternalAction,
): Promise<GetItemState> => {
  const state = { ...prevState }
  state.serial++
  state.idTokenExpired = false
  const uid = await _getUid(state)
  const newState = await _getItemInternalAction(id, uid)
  if (!newState.current && !newState.idTokenExpired) {
    notFound()
  }
  return Object.assign({ ...state }, newState)
}

// Manual validation replaces Zod schema for better error message control

export const updateItemAction = async (
  prevState: UpdateItemState,
  formData: FormData,
  _getUid: typeof getUid = getUid,
  _saveImage: typeof saveImage = saveImage,
  _deleteImage: typeof deleteImage = deleteImage,
): Promise<typeof prevState> => {
  const db = await getDb()
  const state = { ...prevState }
  state.id = null
  state.serial++
  const uid = await _getUid(state)
  if (state.idTokenExpired) {
    return state
  }
  if (!uid) {
    unauthorized()
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

  // The client sends the raw file; the upload itself happens here so the
  // storage backend (local disk or R2) stays an implementation detail.
  const newImageFile = image instanceof File && image.size > 0 ? image : null

  // Manual validation to ensure consistent error messages
  const validationErrors = []

  if (!date || date.trim() === '') {
    validationErrors.push('Date is required')
  }

  if (!title || title.trim() === '') {
    validationErrors.push('Title is required')
  }

  if (!id && (!walkPath || walkPath.trim() === '')) {
    validationErrors.push('Path is required')
  }

  if (newImageFile) {
    if (!newImageFile.type?.startsWith('image/')) {
      validationErrors.push('Image must be an image file')
    } else if (newImageFile.size > 2 * 1024 * 1024) {
      validationErrors.push('Image size must be 2MB or less')
    }
  }

  if (validationErrors.length > 0) {
    state.error = new Error(validationErrors.join(', '))
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
    if (!existingWalk || existingWalk.uid !== uid) {
      forbidden()
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
  if (walkPath) {
    props.path = decode(walkPath)
    props.length =
      sql<number>`ST_Length(${coordinatesToWKT(props.path)}, true)/1000` as unknown as number
  }

  let uploadedImage: string | null = null
  if (willDeleteImage) {
    props.image = null
  } else if (newImageFile) {
    const imagePrefix = process.env.IMAGE_PREFIX ?? 'images'
    const match = newImageFile.name.match(/\.\w+$/)
    const ext = match ? match[0] : ''
    const key = `${imagePrefix}/${uid}-${date}-${nanoid(4)}${ext}`
    try {
      uploadedImage = await _saveImage(newImageFile, key)
    } catch (error) {
      console.error('updateItemAction saveImage error', error)
      state.error = error as Error
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
      console.error('updateItemAction error', error)
      state.error = error as Error
      state.id = null
      if (uploadedImage) {
        void _deleteImage(uploadedImage)
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
      console.error('updateItemAction create error', error)
      state.error = error as Error
      state.id = null
      if (uploadedImage) {
        void _deleteImage(uploadedImage)
      }
      return state
    }
  }

  if (oldImage) {
    void _deleteImage(oldImage)
  }

  revalidateTag(SEARCH_CACHE_TAG, 'max')
  return state
}

export const deleteItemAction = async (
  prevState: DeleteItemState,
  id: number,
  _getUid: typeof getUid = getUid,
): Promise<typeof prevState> => {
  const db = await getDb()
  const state = { ...prevState }
  state.deleted = false
  state.serial++
  const uid = await _getUid(state)
  if (state.idTokenExpired) {
    return state
  }
  if (!uid) {
    unauthorized()
  }

  const walk = await db
    .select()
    .from(walks)
    .where(eq(walks.id, id))
    .limit(1)
    .then((rows) => rows[0])
  if (!walk) {
    notFound()
  }
  if (walk.uid !== uid) {
    forbidden()
  }
  await db.delete(walks).where(eq(walks.id, id))
  state.deleted = true
  revalidateTag(SEARCH_CACHE_TAG, 'max')
  return state
}

export const getCityAction = async (params: CityParams): Promise<CityT[]> => {
  'use cache'
  const db = await getDb()
  let where: SQL
  if (params.jcodes) {
    where = inArray(areas.jcode, params.jcodes)
  } else {
    where = sql`st_contains(${areas.theGeom}, st_setsrid(st_point(${params.longitude}, ${params.latitude}), ${SRID}))`
  }
  const result = await db
    .select()
    .from(areas)
    .where(where)
    .then((rows) => rows.map((area) => asCityT(area)))
  return result
}

export const getUsersAction = async (): Promise<UserT[]> => {
  const db = await getDb()
  const rows = await db.select().from(users).where(eq(users.active, true))
  return rows.map((user) => ({
    uid: user.uid,
    displayName: user.displayName,
    photoURL: user.photoURL,
    active: user.active,
  }))
}
