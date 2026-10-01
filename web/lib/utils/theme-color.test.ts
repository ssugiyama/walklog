import { describe, expect, it } from 'vitest'
import { resolveThemeColors, toViewportThemeColor } from './theme-color'

describe('resolveThemeColors', () => {
  it('uses defaults when nothing is set', () => {
    expect(resolveThemeColors({})).toEqual({
      light: '#ffffff',
      dark: '#000000',
    })
  })

  it('uses THEME_COLOR for both schemes', () => {
    expect(resolveThemeColors({ THEME_COLOR: '#3874cb' })).toEqual({
      light: '#3874cb',
      dark: '#3874cb',
    })
  })

  it('prefers the per-scheme values over THEME_COLOR', () => {
    expect(
      resolveThemeColors({
        THEME_COLOR: '#111111',
        THEME_COLOR_LIGHT: '#aaaaaa',
        THEME_COLOR_DARK: '#bbbbbb',
      }),
    ).toEqual({ light: '#aaaaaa', dark: '#bbbbbb' })
  })
})

describe('toViewportThemeColor', () => {
  it('returns a single plain color when both schemes match', () => {
    expect(toViewportThemeColor({ light: '#3874cb', dark: '#3874cb' })).toBe(
      '#3874cb',
    )
  })

  it('returns media-specific entries when schemes differ', () => {
    expect(toViewportThemeColor({ light: '#fff', dark: '#000' })).toEqual([
      { media: '(prefers-color-scheme: light)', color: '#fff' },
      { media: '(prefers-color-scheme: dark)', color: '#000' },
    ])
  })
})
