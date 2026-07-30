import type { Metadata } from 'next'
import Searcher from '@/lib/utils/searcher'
import SearchBox from './_components/search-box'

const description = process.env.SITE_DESCRIPTION ?? ''

export const metadata: Metadata = {
  description,
  openGraph: {
    title: description,
    url: '/',
  },
}

export default function Page() {
  return (
    <>
      <Searcher />
      <SearchBox />
    </>
  )
}
