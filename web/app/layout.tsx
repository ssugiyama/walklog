import Body from '../lib/components/body';
import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'

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