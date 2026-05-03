import 'server-only'

import { put } from '@vercel/blob'
import { uploadOriginalPhotoBuffer } from '@/lib/googleDrive'

export type PhotoStorageProvider = 'google_drive' | 'vercel_blob'

export interface StoredPhoto {
  provider: PhotoStorageProvider
  fileId: string
  url?: string
  name: string
  mimeType: string
  size: number
}

export function getPhotoStorageProvider(): PhotoStorageProvider {
  return process.env.PHOTO_STORAGE_PROVIDER === 'vercel_blob' ? 'vercel_blob' : 'google_drive'
}

export async function uploadPhotoEvidence(
  buffer: Buffer,
  name: string,
  mimeType = 'application/octet-stream',
  sizeBytes = buffer.byteLength,
): Promise<StoredPhoto> {
  if (getPhotoStorageProvider() === 'vercel_blob') {
    const pathname = `preview-test/${name}`
    const blob = await put(pathname, buffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType: mimeType,
    })

    return {
      provider: 'vercel_blob',
      fileId: blob.url,
      url: blob.url,
      name: blob.pathname,
      mimeType: blob.contentType ?? mimeType,
      size: sizeBytes,
    }
  }

  const uploaded = await uploadOriginalPhotoBuffer(buffer, name, mimeType, sizeBytes)
  return {
    provider: 'google_drive',
    fileId: uploaded.fileId,
    name: uploaded.name,
    mimeType: uploaded.mimeType,
    size: uploaded.size,
  }
}
