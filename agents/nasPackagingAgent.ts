import type { MediaArtifact } from '@/types/media'

export function runNasPackagingAgent(media: MediaArtifact[], surveyMonth: string, surveyorId: string) {
  return media.map((item) => ({
    mediaId: item.id,
    targetFileName: `${item.sampleId}_${surveyMonth}_${item.photoType}_${surveyorId}_approved.jpg`,
    sourceDriveFileId: item.watermarkedDriveFileId ?? item.originalDriveFileId,
  }))
}
