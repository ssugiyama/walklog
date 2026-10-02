import type { Metadata, Viewport } from 'next'
import { Roboto } from 'next/font/google'
import {
  resolveThemeColors,
  themeBackgroundCss,
  toViewportThemeColor,
} from '@/lib/utils/theme-color'
import Body from './_components/body'

export const viewport: Viewport = {
  themeColor: toViewportThemeColor(resolveThemeColors(process.env)),
}

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={{ height: '100%' }} className={roboto.variable}>
      <head>
        <style>{themeBackgroundCss(resolveThemeColors(process.env))}</style>
      </head>
      <body style={{ margin: 0, height: '100%' }}>
        <Body>{children}</Body>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  title: {
    template: `%s | ${process.env.SITE_NAME || 'Walklog'}`,
    default: process.env.SITE_NAME || 'Walklog',
  },
  appleWebApp: {
    title: process.env.SITE_NAME || 'Walklog',
    capable: true,
    statusBarStyle: 'default',
  },
}
