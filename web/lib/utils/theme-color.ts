type ThemeEnv = Record<string, string | undefined>

export type ThemeColors = { light: string; dark: string }

export const resolveThemeColors = (env: ThemeEnv): ThemeColors => ({
  light: env.THEME_COLOR_LIGHT || env.THEME_COLOR || '#ffffff',
  dark: env.THEME_COLOR_DARK || env.THEME_COLOR || '#000000',
})

// A plain tag without `media` is understood by every browser that supports
// theme-color; media-qualified tags are only needed when the colors differ.
export const toViewportThemeColor = ({ light, dark }: ThemeColors) =>
  light === dark
    ? light
    : [
        { media: '(prefers-color-scheme: light)', color: light },
        { media: '(prefers-color-scheme: dark)', color: dark },
      ]
