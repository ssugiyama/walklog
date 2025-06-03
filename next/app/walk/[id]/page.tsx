import ItemBox from "../../../lib/components/item-box"
import { getItemAction } from "../../lib/walk-actions"

export default async function Page() {
  return (
    <ItemBox /> 
  )
}

export async function generateMetadata({params}) {
  const getItemState = {
    error: null,
    idTokenExpired: false,
    curernt: null,
    serial: 0,
  }
  const { id } = await params
  const newState = await getItemAction(getItemState, id)
  if (!newState.current) {
    return {
      title: newState.error ? 'Error' : 'Not Found',
      description: newState.error ? newState.error : 'Not Found',
    }
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
      url: `/walk/${id}`,
      images: [
        {
          url: image,
        },
      ],
    },
  }
}