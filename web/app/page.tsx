import SearchBox from "@/lib/components/search-box";
import type { Metadata } from 'next'

const description = process.env.SITE_DESCRIPTION || ''

export const metadata: Metadata = {
  description,
  openGraph: {
    title: process.env.SITE_NAME || 'Walklog',
    description,
    url: '/',
  }
}

export default function Page() {
  return (
    <SearchBox />
  )
}