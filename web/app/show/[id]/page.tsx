import { connection } from 'next/server'
import { Suspense } from 'react'
import { getItemAction } from '@/lib/actions/walk-actions'
import ItemFetcher from '@/lib/utils/item-fetcher'
import { idToShowUrl } from '@/lib/utils/meta-utils'
import ItemBox from './_components/item-box'

// generateMetadata below reads params and cookies (via getItemAction), which
// are runtime-only inputs. Without this marker, Cache Components errors
// because it can't tell whether that's intentional - see
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
      <ItemBox />
    </>
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const getItemState = {
    error: null,
    idTokenExpired: false,
    current: null,
    serial: 0,
  }
  const { id } = await params
  const newState = await getItemAction(getItemState, Number(id))
  if (!newState.current) {
    return {}
  }
  const item = newState.current
  const title = `${item.date} : ${item.title} (${item.length.toFixed(1)} km)`
  const description =
    item.comment &&
    `${item.comment.replace(/[\n\r]/g, '').substring(0, 140)}...`
  const image = item.image
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: idToShowUrl(item.id),
      images: image
        ? [
            {
              url: image,
            },
          ]
        : [],
    },
  }
}
