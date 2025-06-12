import Body from '../lib/components/body';
import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import type { Viewport } from 'next'
 
export const viewport: Viewport = {

  themeColor: [
    { media: '(prefers-color-scheme: light)', color: process.env.THEME_COLOR_LIGHT || process.env.THEME_COLOR || '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: process.env.THEME_COLOR_DARK || process.env.THEME_COLOR || '#000000' },
  ],
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
      <body style={{ margin: 0, height: '100%' }}>
        <Body>
          {children}
        </Body>
      </body>
    </html>
  )
}


export const metadata: Metadata = {
  title: {
    template: `%s | ${process.env.SITE_NAME || 'Walklog'}`,
    default: process.env.SITE_NAME || 'Walklog',
  },
}