import { deleteLocal, saveLocal } from './local'
import { deleteR2, saveR2 } from './r2'

const useR2 = (): boolean => process.env.IMAGE_STORAGE === 'R2'

export const saveImage = (file: File, key: string): Promise<string> =>
  useR2() ? saveR2(file, key) : saveLocal(file, key)

export const deleteImage = (urlOrKey: string): Promise<void> =>
  useR2() ? deleteR2(urlOrKey) : deleteLocal(urlOrKey)
