'use client'
import AppError from './_components/app-error'

export default function AppErrorBoundary({ error }: { error?: Error }) {
  return <AppError error={error} />
}
