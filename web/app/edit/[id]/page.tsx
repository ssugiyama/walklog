import ItemFetcher from '@/lib/utils/item-fetcher'
import WalkEditor from '@/lib/components/walk-editor'

export default function Page() {
  return (
    <>
      <ItemFetcher />
      <WalkEditor mode="update" /> 
    </>
  )
}

export async function generateMetadata({params}: {params: Promise<{ id: string }>}) {
  const { id } = await params
  const title = `edit walk : ${id}`
  return {
    title,
  }
}