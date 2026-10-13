import { z } from 'zod'

export const DEFAULT_SEARCH_LIMIT = 20
export const MAX_SEARCH_LIMIT = 100
export const MAX_SEARCH_OFFSET = 10000

export const SEARCH_ORDERS = [
  'newest_first',
  'oldest_first',
  'longest_first',
  'shortest_first',
  'easternmost_first',
  'westernmost_first',
  'southernmost_first',
  'northernmost_first',
  'nearest_first',
] as const

export const SEARCH_FILTERS = [
  '',
  'neighborhood',
  'start',
  'end',
  'cities',
  'crossing',
  'hausdorff',
  'frechet',
] as const

// The Searcher fills unused keys with '' (see searcher.tsx), so every
// string param accepts an empty string in addition to its real format.
const emptyOr = (pattern: RegExp, name: string) =>
  z.string().regex(new RegExp(`^(${pattern.source})?$`), `Invalid ${name}`)

const bounded = (name: string, min: number, max: number) =>
  z
    .number({ error: `Invalid ${name}. Must be an integer.` })
    .int(`Invalid ${name}. Must be an integer between ${min} and ${max}.`)
    .min(min, `Invalid ${name}. Must be an integer between ${min} and ${max}.`)
    .max(max, `Invalid ${name}. Must be an integer between ${min} and ${max}.`)

export const searchFilterSchema = z.enum(SEARCH_FILTERS)

export const searchPropsSchema = z.object({
  date: z.string().optional(),
  user: z.string().optional(),
  year: emptyOr(/\d{1,4}/, 'year').optional(),
  month: emptyOr(/\d{1,2}/, 'month').optional(),
  filter: z.enum(SEARCH_FILTERS, { error: 'Invalid filter' }).optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  center: emptyOr(/-?\d+(\.\d+)?,-?\d+(\.\d+)?/, 'center').optional(),
  radius: emptyOr(/\d+(\.\d+)?/, 'radius').optional(),
  cities: z.string().optional(),
  path: z.string().optional(),
  max_distance: z.number().positive().finite().optional(),
  limit: bounded('limit', 1, MAX_SEARCH_LIMIT).optional(),
  offset: bounded('offset', 0, MAX_SEARCH_OFFSET).optional(),
  order: z.enum(SEARCH_ORDERS, { error: 'Invalid order' }).optional(),
})

export type ParsedSearchProps = z.infer<typeof searchPropsSchema>

// Route param `[id]` (a walk's serial primary key).
export const idParamSchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)

// `?index=` carries a row position into the loaded search results.
export const indexParamSchema = z.string().regex(/^\d+$/).transform(Number)
