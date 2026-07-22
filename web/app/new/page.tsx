import type { Metadata } from 'next'
import WalkEditor from '@/lib/components/walk-editor'

export default function Page() {
  return <WalkEditor mode="create" />
}

export const metadata: Metadata = {
  title: 'new walk',
}
