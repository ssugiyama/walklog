'use server'

import Sequelize from 'sequelize'
import { sequelize, Walk, Area, EARTH_RADIUS, SRID, SRID_FOR_SIMILAR_SEARCH, WalkAttributes } from '../../lib/db/models'
import { CityParams, CityT, SearchProps, UserT, SearchState, GetItemState, DeleteItemState, UpdateItemState, ConfigT } from '@/types'
import admin from 'firebase-admin'
import url from 'url'
import path from 'path'
import { nanoid } from 'nanoid'
import { cookies } from 'next/headers'
import fs from 'fs'
import { unstable_cacheTag as cacheTag } from 'next/cache'
import { revalidateTag } from 'next/cache'
import { notFound, unauthorized, forbidden } from 'next/navigation'

let firebaseConfig

const loadFirebaseConfig = () => {
  const content = fs.readFileSync(process.env.FIREBASE_CONFIG)
  firebaseConfig = JSON.parse(content.toString())
  if (admin.apps.length === 0) {
    admin.initializeApp({ ...firebaseConfig, credential: admin.credential.applicationDefault() })
  }
}

export const getPackageVersion = () => {
  const content = fs.readFileSync(process.env.npm_package_json)
  const packageJson = JSON.parse(content.toString())
  return packageJson.version
}

export const getConfig = async (): Promise<ConfigT> => {
  'use cache'
  const shapeStylesContent = fs.readFileSync(process.env.SHAPE_STYLES_JSON ?? './default-shape-styles.json')
  const shapeStyles = JSON.parse(shapeStylesContent.toString())
  const themeContent = fs.readFileSync(process.env.THEME_JSON ?? './default-theme.json')
  const theme = JSON.parse(themeContent.toString())
  if (!firebaseConfig) loadFirebaseConfig()
  return {
    googleApiKey: process.env.GOOGLE_API_KEY,
    googleApiVersion: process.env.GOOGLE_API_VERSION ?? 'weekly',
    openUserMode: !!process.env.OPEN_USER_MODE,
    appVersion: getPackageVersion(),
    defaultCenter: process.env.DEFAULT_CENTER,
    defaultZoom: parseInt(process.env.DEFAULT_ZOOM ?? '12', 10),
    defaultRadius: 500,
    mapTypeIds: process.env.MAP_TYPE_IDS ?? 'roadmap,hybrid,satellite,terrain',
    mapId: process.env.MAP_ID,
    firebaseConfig,
    shapeStyles,
    theme,
  }
}

const { Op } = Sequelize

const SEARCH_CACHE_TAG = 'searchTag'

const openUserMode: boolean = !!process.env.OPEN_USER_MODE
const firebaseStorage: boolean = !!process.env.FIREBASE_STORAGE

const getUid = async (state) => {
  const cookieStore = await cookies()
  state.idTokenExpired = false
  const idToken = cookieStore.get('idToken')
  if (!idToken?.value) {
    return [null, false]
  }
  try {
    const claim = await admin.auth()
      .verifyIdToken(idToken.value)
    return [claim?.uid, claim?.admin ?? false]
  } catch (error) {
    if (error.code === 'auth/id-token-expired') {
      state.idTokenExpired = true
    } else {
      state.error = error.message
    }
    return [null, false]
  }
}

export const searchInternalAction = async (props: SearchProps, uid: string): Promise<SearchState> => {
  'use cache'
  cacheTag(SEARCH_CACHE_TAG)
  const attributes: Array<string | [string, string]> = ['id', 'date', 'title', 'image', 'comment', 'path', 'length', 'uid', 'draft']
  const state: SearchState = {
    count: 0,
    rows: [],
  }
  const orderHash = {
    newest_first: ['date', 'desc'],
    oldest_first: 'date',
    longest_first: ['length', 'desc'],
    shortest_first: 'length',
    easternmost_first: [sequelize.fn('st_xmax', sequelize.col('path')), 'desc'],
    westernmost_first: sequelize.fn('st_xmin', sequelize.col('path')),
    southernmost_first: sequelize.fn('st_ymin', sequelize.col('path')),
    northernmost_first: [sequelize.fn('st_ymax', sequelize.col('path')), 'desc'],
    nearest_first: sequelize.literal('distance'),
  }

  const where = []
  const order = orderHash[props.order ?? 'newest_first']

  if (props.date) {
    where.push({ date: props.date })
  }
  if (props.user) {
    where.push({ uid: props.user })
  }
  if (props.year) {
    where.push(sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('date')), parseInt(props.year as string, 10)))
  }
  if (props.month) {
    where.push(sequelize.where(sequelize.fn('date_part', 'month', sequelize.col('date')), parseInt(props.month as string, 10)))
  }
  if (['neighborhood', 'start', 'end'].includes(props.filter as string)) {
    const c = props.center.split(/,/)
    const latitude = parseFloat(c[0]) ?? 0
    const longitude = parseFloat(c[1]) ?? 0
    const radius = parseFloat(props.radius as string)
    const dlat = (radius * 180) / Math.PI / EARTH_RADIUS
    const mlat = latitude > 0 ? latitude + dlat : latitude - dlat
    const dlon = dlat / Math.cos((mlat / 180) * Math.PI)
    const center = Walk.getPoint(longitude, latitude)
    const lb = Walk.getPoint(longitude - dlon, latitude - dlat)
    const rt = Walk.getPoint(longitude + dlon, latitude + dlat)
    let target
    switch (props.filter) {
      case 'neighborhood':
        target = sequelize.col('path')
        break
      case 'start':
        target = sequelize.fn('st_startpoint', sequelize.col('path'))
        break
      default:
        target = sequelize.fn('st_endpoint', sequelize.col('path'))
        break
    }
    where.push(sequelize.where(sequelize.fn('st_makebox2d', lb, rt), {
      [Op.overlap]: target,
    }))
    where.push(sequelize.where(sequelize.fn('st_distance', target, center, true), {
      [Op.lte]: radius,
    }))
  } else if (props.filter === 'cities') {
    if (!props.cities) {
      state.count = 0
      state.rows = []
      return state
    }
    const cities = (props.cities as string).split(/,/).map((elm) => `'${elm}'`).join(',')
    where.push(sequelize.literal(`EXISTS (SELECT * FROM areas WHERE jcode IN (${cities}) AND path && the_geom AND ST_Intersects(path, the_geom))`))
  } else if (props.filter === 'crossing') {
    if (!props.path) {
      state.count = 0
      state.rows = []
      return state
    }
    const linestring = Walk.decodePath(props.path as string)
    where.push({
      path: {
        [Op.overlap]: linestring,
      },
    })
    where.push(sequelize.fn('ST_Intersects', sequelize.col('path'), linestring))
  } else if (props.filter === 'hausdorff') {
    if (!props.path) {
      state.count = 0
      state.rows = []
      return state
    }
    const maxDistance = props.max_distance ?? 4000
    const linestring = Walk.decodePath(props.path as string)
    const extent = Walk.getPathExtent(props.path as string)
    const dlat = (maxDistance * 180) / Math.PI / EARTH_RADIUS
    const mlat = Math.max(Math.abs(extent.ymax + dlat), Math.abs(extent.ymin - dlat))
    const dlon = dlat / Math.cos((mlat / 180) * Math.PI)
    const lb = Walk.getPoint(extent.xmin - dlon, extent.ymin - dlat)
    const rt = Walk.getPoint(extent.xmax + dlon, extent.ymax + dlat)

    attributes.push([`ST_HausdorffDistance(ST_Transform(path, ${SRID_FOR_SIMILAR_SEARCH}), ST_Transform('${linestring}'::Geometry, ${SRID_FOR_SIMILAR_SEARCH}))/1000`, 'distance'])
    where.push(sequelize.fn('ST_Within', sequelize.col('path'), sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakeBox2d', lb, rt), SRID)))
    where.push(sequelize.where(sequelize.fn(
      'ST_HausdorffDistance',
      sequelize.fn('ST_Transform', sequelize.col('path'), SRID_FOR_SIMILAR_SEARCH),
      sequelize.fn('ST_Transform', sequelize.fn('st_geomfromtext', linestring), SRID_FOR_SIMILAR_SEARCH),
    ), {
      [Op.lt]: maxDistance,
    }))
  } else if (props.filter === 'frechet') {
    if (!props.path) {
      state.count = 0
      state.rows = []
      return state
    }
    const maxDistance = props.max_distance ?? 4000
    const linestring = Walk.decodePath(props.path as string)
    const sp = Walk.getStartPoint(props.path as string)
    const ep = Walk.getEndPoint(props.path as string)
    const dlat = (maxDistance * 180) / Math.PI / EARTH_RADIUS
    const mlat = Math.max(
      Math.abs(sp[1] + dlat),
      Math.abs(sp[1] - dlat),
      Math.abs(ep[1] + dlat),
      Math.abs(ep[1] - dlat),
    )
    const dlon = dlat / Math.cos((mlat / 180) * Math.PI)
    const slb = Walk.getPoint(sp[0] - dlon, sp[1] - dlat)
    const srt = Walk.getPoint(sp[0] + dlon, sp[1] + dlat)
    const elb = Walk.getPoint(ep[0] - dlon, ep[1] - dlat)
    const ert = Walk.getPoint(ep[0] + dlon, ep[1] + dlat)

    attributes.push([`ST_FrechetDistance(ST_Transform(path, ${SRID_FOR_SIMILAR_SEARCH}), ST_Transform('${linestring}'::Geometry, ${SRID_FOR_SIMILAR_SEARCH}))/1000`, 'distance'])
    where.push(sequelize.fn('ST_Within', sequelize.fn('ST_StartPoint', sequelize.col('path')), sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakeBox2d', slb, srt), SRID)))
    where.push(sequelize.fn('ST_Within', sequelize.fn('ST_EndPoint', sequelize.col('path')), sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakeBox2d', elb, ert), SRID)))
    where.push(sequelize.where(sequelize.fn(
      'ST_FrechetDistance',
      sequelize.fn('ST_Transform', sequelize.col('path'), SRID_FOR_SIMILAR_SEARCH),
      sequelize.fn('ST_Transform', sequelize.fn('st_geomfromtext', linestring), SRID_FOR_SIMILAR_SEARCH),
    ), {
      [Op.lt]: maxDistance,
    }))
  }

  if (uid !== null) {
    where.push({ [Op.or]: [{ draft: false }, { uid }] })
  } else {
    where.push({ draft: false })
  }

  const limit = props.limit ?? 20
  const offset = props.offset ?? 0

  const condition = { [Op.and]: where }
  const result = await Walk.findAndCountAll({
    attributes,
    order: [order],
    where: condition,
    offset,
    limit,
  })

  state.count = result.count
  state.offset = result.count > offset + limit ? offset + limit : 0
  state.rows = result.rows.map((row) => row.asObject(true))
  return state
}

export const searchAction = async (prevState: SearchState, props: SearchProps, _getUid = getUid, _searchInternalAction = searchInternalAction): Promise<typeof prevState> => {
  const state = { ...prevState }
  state.serial++
  state.idTokenExpired = false
  state.append = (props.offset > 0)

  const [uid] = await _getUid(state)
  const newState = await _searchInternalAction(props, uid)
  return Object.assign({ ...state }, newState)
}

export const getItemInternalAction = async (id: number, uid: string): Promise<GetItemState> => {
  'use cache'
  cacheTag(SEARCH_CACHE_TAG)
  const state: GetItemState = {}

  const walk = await Walk.findByPk(id)
  if (!walk) {
    return state
  }
  
  state.current = (!walk.draft || walk.uid === uid) ? walk.asObject(true) : null
  return state
}

export const getItemAction = async (prevState: GetItemState, id: number, _getUid = getUid, _getItemInternalAction = getItemInternalAction): Promise<GetItemState> => {
  const state = { ...prevState }
  state.serial++
  state.idTokenExpired = false
  const [uid] = await _getUid(state)
  const newState = await _getItemInternalAction(id, uid)
  if (!newState.current && !newState.idTokenExpired) {
    notFound()
  }
  return Object.assign({ ...state }, newState)
}

const getFilename = (uid: string, date: string, file: File) => {
  const match = file.name.match(/\.\w+$/)
  const ext = match ? match[0] : ''
  const basename = `${uid}-${date}-${nanoid(4)}`
  return match ? basename + ext : basename
}

// Manual validation replaces Zod schema for better error message control

export const updateItemAction = async (prevState: UpdateItemState, formData, _getUid = getUid): Promise<typeof prevState> => {
  const state = { ...prevState }
  state.id = null
  state.serial++
  const [uid, isAdmin] = await _getUid(state)
  if (state.idTokenExpired) {
    return state
  }
  if (!uid) {
    unauthorized()
  } else if (!openUserMode && !isAdmin) {
    forbidden()
  }

  // Extract form data
  const id = formData.get('id')
  const date = formData.get('date')
  const title = formData.get('title')
  const comment = formData.get('comment')
  const image = formData.get('image')
  const walkPath = formData.get('path')
  const draft = formData.get('draft') === 'true' ? true : false
  const willDeleteImage = formData.get('will_delete_image') === 'true' ? true : false

  // Manual validation to ensure consistent error messages
  const validationErrors = []
  
  if (!date || date.trim() === '') {
    validationErrors.push('Date is required')
  }
  
  if (!title || title.trim() === '') {
    validationErrors.push('Title is required')
  }
  
  if (!walkPath || walkPath.trim() === '') {
    validationErrors.push('Path is required')
  }
  
  // Image validation
  if (image && image.size > 0) {
    if (!image.type) {
      validationErrors.push('Image must be a valid file')
    } else if (!image.type?.startsWith('image/')) {
      validationErrors.push('Image must be an image file')
    } else if (image.size > 2 * 1024 * 1024) {
      validationErrors.push('Image size must be 2MB or less')
    }
  }
  
  if (validationErrors.length > 0) {
    state.error = new Error(validationErrors.join(', '))
    return state
  }

  const props: WalkAttributes = {
    title,
    comment,
    date,
    draft,
    uid,
  }
  if (walkPath !== '') {
    props.path = Walk.decodePath(walkPath)
    props.length = sequelize.literal(`ST_LENGTH('${props.path}', true)/1000`)
  }
  if (willDeleteImage) {
    props.image = null
  } else if ((image?.size ?? 0) > 0) {
    try {
      const prefix = process.env.IMAGE_PREFIX ?? 'images'
      const filePath = path.join(prefix, getFilename(uid, date, image))
      const content = await image.arrayBuffer()
      const buffer = Buffer.from(content)
      if (firebaseStorage) {
        const bucket = admin.storage().bucket()
        const blob = bucket.file(filePath)
        await blob.save(buffer) // await を追加
        props.image = url.resolve('https://storage.googleapis.com', path.join(bucket.name, blob.name))
      } else {
        fs.writeFileSync(`public/${filePath}`, buffer)
        props.image = filePath
      }
    } catch (error) {
      console.error('updateItemAction image error', error)
      state.error = error
      state.id = null
      return state
    }
  }
  if (id) {
    const walk = await Walk.findByPk(id)
    if (walk.uid !== uid) {
      forbidden()
    }
    try {
      await walk.update(props)
      state.id = id
    } catch (error) {
      console.error('updateItemAction error', error)
      state.error = error
      state.id = null
      return state
    }
  } else {
    try {
      const walk = await Walk.create(props)
      state.id = walk?.id
    } catch (error) {
      console.error('updateItemAction create error', error)
      state.error = error
      state.id = null
      return state
    }
  }
  revalidateTag(SEARCH_CACHE_TAG)
  return state
}

export const deleteItemAction = async (prevState: DeleteItemState, id: number, _getUid = getUid): Promise<typeof prevState> => {
  const state = { ...prevState }
  state.deleted = false
  state.serial++
  const [uid, isAdmin] = await _getUid(state)
  if (state.idTokenExpired) {
    return state
  }
  if (!uid) {
    unauthorized()
  } else if (!openUserMode && !isAdmin) {
    forbidden()
  }

  const walk = await Walk.findByPk(id)
  if (!walk) {
    notFound()
  }
  if (walk.uid !== uid) {
    forbidden()
  }
  await walk.destroy()
  state.deleted = true
  revalidateTag(SEARCH_CACHE_TAG)
  return state
}

export const getCityAction = async (params: CityParams): Promise<CityT[]> => {
  'use cache'
  let where
  if (params.jcodes) {
    where = { jcode: { [Op.in]: params.jcodes } }
  } else {
    where = sequelize.fn('st_contains', sequelize.col('the_geom'), sequelize.fn('st_setsrid', sequelize.fn('st_point', params.longitude, params.latitude), SRID))
  }
  const result = await Area.findAll({
    where,
  })
  return result.map((obj) => obj.asObject())
}

export const getUsersAction = async (): Promise<UserT[]> => {
  'use cache'
  const userResult = await admin.auth().listUsers(1000)
  return userResult.users.map((user) => {
    const { uid, displayName, photoURL } = user
    const admin = user.customClaims?.admin || false
    return { uid, displayName, photoURL, admin }
  })
}

