import type { MetadataRoute } from 'next'
import { resolveThemeColors } from '@/lib/utils/theme-color'

export default function manifest(): MetadataRoute.Manifest {
  const { light } = resolveThemeColors(process.env)
  return {
    name: 'walklog',
    short_name: 'walklog',
    icons: [
      { src: 'icons/icon2.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon1.png', sizes: '512x512', type: 'image/png' },
    ],
    display: 'standalone',
    start_url: '/',
    theme_color: light,
    background_color: light,
  }
}
