import { describe, expect, it } from 'vite-plus/test'
import {
  idParamSchema,
  indexParamSchema,
  searchPropsSchema,
} from './search-params-schema'

describe('searchPropsSchema', () => {
  it('accepts the Searcher defaults', () => {
    const result = searchPropsSchema.safeParse({
      id: null,
      filter: '',
      user: '',
      month: '',
      year: '',
      order: 'newest_first',
      limit: 20,
      offset: 0,
      center: '35.68,139.76',
      radius: '500',
      cities: '',
      path: '',
    })
    expect(result.success).toBe(true)
  })

  it.each([
    [{ limit: 500 }, /Invalid limit/],
    [{ limit: NaN }, /Invalid limit/],
    [{ offset: -1 }, /Invalid offset/],
    [{ order: 'bogus' }, /Invalid order/],
    [{ filter: 'bogus' }, /Invalid filter/],
    [{ year: 'abc' }, /Invalid year/],
    [{ center: 'x,y' }, /Invalid center/],
    [{ radius: '-5' }, /Invalid radius/],
  ])('rejects %j', (props, message) => {
    const result = searchPropsSchema.safeParse(props)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0].message).toMatch(message)
  })
})

describe('idParamSchema / indexParamSchema', () => {
  it('parses valid values', () => {
    expect(idParamSchema.parse('12')).toBe(12)
    expect(indexParamSchema.parse('0')).toBe(0)
  })
  it.each(['abc', '0', '-1', '1.5', ''])('rejects id %j', (v) => {
    expect(idParamSchema.safeParse(v).success).toBe(false)
  })
  it.each([null, 'abc', '-1', '1.5'])('rejects index %j', (v) => {
    expect(indexParamSchema.safeParse(v).success).toBe(false)
  })
})
