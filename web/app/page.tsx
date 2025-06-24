import SearchBox from "@/lib/components/search-box";
import type { Metadata } from 'next'
import Searcher from "@/lib/utils/searcher";
const description = process.env.SITE_DESCRIPTION || ''

export const metadata: Metadata = {
  description,
  openGraph: {
    title: 
    description,
    url: '/',
  }
}

export default function Page() {
  return (
    <>
      <Searcher />
      <SearchBox />
    </>
  )
}