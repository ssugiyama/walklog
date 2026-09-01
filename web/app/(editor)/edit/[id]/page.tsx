import { connection } from 'next/server'
import { Suspense } from 'react'
import ItemFetcher from '@/lib/utils/item-fetcher'
import WalkEditor from '../../_components/walk-editor'

// generateMetadata below reads params, a runtime-only input. Without this
// marker, Cache Components errors because it can't tell whether that's
// intentional - see
// https://nextjs.org/docs/messages/blocking-prerender-metadata-runtime
const Connection = async () => {
  await connection()
  return null
}

function DynamicMarker() {
  return (
    <Suspense>
      <Connection />
    </Suspense>
  )
}

export default function Page() {
  return (
    <>
      <DynamicMarker />
      <ItemFetcher />
      <WalkEditor mode="update" />
    </>
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const title = `edit walk : ${id}`
  return {
    title,
  }
}
