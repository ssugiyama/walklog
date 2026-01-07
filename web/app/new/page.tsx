import WalkEditor from '@/lib/components/walk-editor'
import type { Metadata } from 'next'

export default async function Page() {
  return (
    <WalkEditor mode="create" /> 
  )
}

export const metadata: Metadata = {
  title: 'new walk',
}

