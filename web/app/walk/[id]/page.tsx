import { notFound, redirect } from 'next/navigation'
import { idToShowUrl } from '@/lib/utils/meta-utils'
import { idParamSchema } from '@/lib/utils/search-params-schema'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const parsedId = idParamSchema.safeParse(id)
  if (!parsedId.success) {
    notFound()
  }
  redirect(idToShowUrl(parsedId.data))
}
