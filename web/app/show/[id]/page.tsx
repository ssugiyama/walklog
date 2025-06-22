import ItemBox from "../../../lib/components/item-box"
import { getItemAction } from "../../lib/walk-actions"
import ItemFetcher from "@/lib/utils/item-fetcher"

export default async function Page() {
  return (
    <>
      <ItemFetcher />
      <ItemBox /> 
    </>
  )
}

export async function generateMetadata({params}: {params: Promise<{ id: string }>}) {
  const getItemState = {
    error: null,
    idTokenExpired: false,
    curernt: null,
    serial: 0,
  }
  const { id } = await params
  const newState = await getItemAction(getItemState, Number(id))
  if (!newState.current) {
    return {}
  }
  const item = newState.current
  const title = `${item.date} : ${item.title} (${item.length.toFixed(1)} km)`
  const description = item.comment && (`${item.comment.replace(/[\n\r]/g, '').substring(0, 140)}...`)
  const image = item.image
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/show/${id}`,
      images: image ? [
        {
          url: image,
        },
      ] : [],
    },
  }
}