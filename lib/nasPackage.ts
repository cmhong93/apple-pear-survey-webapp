import { runNasPackagingAgent } from '@/agents/nasPackagingAgent'
import type { MediaArtifact } from '@/types/media'

export function createNasPackageManifest(media: MediaArtifact[], surveyMonth: string, surveyorId: string) {
  return {
    createdAt: new Date().toISOString(),
    files: runNasPackagingAgent(media, surveyMonth, surveyorId),
  }
}
