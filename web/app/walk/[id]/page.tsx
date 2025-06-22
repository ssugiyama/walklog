import { redirect } from 'next/navigation'
import { idToUrl } from '@/lib/utils/meta-utils'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(idToUrl(id))
}

