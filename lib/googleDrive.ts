import type { MediaArtifact } from '@/types/media'

export function isGoogleDriveConfigured() {
  return Boolean(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ?? process.env.GOOGLE_DRIVE_FOLDER_ID)
}

export async function uploadMediaArtifact(artifact: MediaArtifact) {
  return {
    configured: isGoogleDriveConfigured(),
    originalDriveFileId: artifact.originalDriveFileId ?? `mock-original-${artifact.id}`,
  }
}
