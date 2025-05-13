import { ConfigProvider } from '@/lib/utils/config';
import Body from '../lib/components/body';

import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import fs from 'fs'
import admin from 'firebase-admin'

const roboto = Roboto({
    weight: ['300', '400', '500', '700'],
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-roboto',
})

let content = fs.readFileSync(process.env.FIREBASE_CONFIG)
const firebaseConfig = JSON.parse(content.toString())
content = fs.readFileSync(process.env.DRAWING_STYLES_JSON || './default-drawing-styles.json')
const drawingStyles = JSON.parse(content.toString())
const config = {
    firebaseConfig,
    drawingStyles,
}
if (admin.apps.length === 0) {
    admin.initializeApp({ ...firebaseConfig, credential: admin.credential.applicationDefault() })
}

export default function RootLayout({
    children,
  }: {
    children: React.ReactNode
  }) {

    return (
        <html lang="en" style={{ height: '100%' }} className={roboto.variable}>
            <body style={{ margin: 0, height: '100%' }}>
                <ConfigProvider config={config}>
                <Body>
                    {children}
                </Body>
                </ConfigProvider>
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