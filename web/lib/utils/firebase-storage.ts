import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from 'firebase/storage'

export const uploadImage = async (
  file: File,
  path: string,
): Promise<string> => {
  const storageRef = ref(getStorage(), path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

// Best-effort cleanup: swallow errors so a missing/foreign/already-deleted
// object never blocks the caller (e.g. a save that already succeeded).
export const deleteImage = async (urlOrPath: string): Promise<void> => {
  try {
    await deleteObject(ref(getStorage(), urlOrPath))
  } catch {
    // ignore
  }
}
