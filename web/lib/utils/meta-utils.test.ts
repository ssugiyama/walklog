import type { WalkT } from '@/types'
import { walkDescription, walkTitle } from './meta-utils'

const item: WalkT = {
  id: 1,
  uid: 'u',
  date: '2026-01-02',
  title: 'T',
  length: 3.14,
}

describe('walkTitle', () => {
  it('formats date, title and length', () => {
    expect(walkTitle(item)).toBe('2026-01-02 : T (3.1 km)')
  })
})

describe('walkDescription', () => {
  it('is undefined without a comment', () => {
    expect(walkDescription(item)).toBeUndefined()
  })
  it('strips newlines and truncates to 140 chars', () => {
    const d = walkDescription({ ...item, comment: 'a\nb' + 'c'.repeat(200) })
    expect(d).toBe('ab' + 'c'.repeat(138) + '...')
  })
})
