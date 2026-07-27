import { AwsClient } from 'aws4fetch'

const getClient = (): AwsClient =>
  new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto',
    retries: 0,
  })

const getObjectUrl = (key: string): string =>
  `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET_NAME}/${key}`

export const saveR2 = async (file: File, key: string): Promise<string> => {
  const body = await file.arrayBuffer()
  const response = await getClient().fetch(getObjectUrl(key), {
    method: 'PUT',
    body,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `Failed to upload to R2: ${response.status} ${response.statusText} ${body}`,
    )
  }
  return `${process.env.R2_PUBLIC_URL}/${key}`
}

// Best-effort cleanup: swallow errors so a missing/foreign/already-deleted
// object never blocks the caller (e.g. a save that already succeeded).
export const deleteR2 = async (urlOrKey: string): Promise<void> => {
  const publicUrl = process.env.R2_PUBLIC_URL
  const key =
    publicUrl && urlOrKey.startsWith(publicUrl)
      ? urlOrKey.slice(publicUrl.length).replace(/^\//, '')
      : urlOrKey.replace(/^\//, '')
  try {
    await getClient().fetch(getObjectUrl(key), { method: 'DELETE' })
  } catch {
    // ignore
  }
}
