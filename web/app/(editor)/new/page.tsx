import type { Metadata } from 'next'
import WalkEditor from '../_components/walk-editor'

export default function Page() {
  return <WalkEditor mode="create" />
}

export const metadata: Metadata = {
  title: 'new walk',
}
