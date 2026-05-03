import type { MediaArtifact } from '@/types/media'
import type { QaFinding } from '@/types/qa'

export async function runVisionQaAgent(media: MediaArtifact[] = []): Promise<QaFinding[]> {
  if (media.length === 0) return []

  return media.flatMap((item) => {
    if (item.visionQaFindings?.length) {
      return item.visionQaFindings.map((finding) => ({
        ...finding,
        evidenceIds: [...(finding.evidenceIds ?? []), item.id],
      }))
    }

    return [
      {
        code: 'vision_qa_not_available_for_media',
        message: `${item.originalFileName} 사진은 AI 사진 검수 결과 없이 업로드되었습니다.`,
        severity: 'info',
        evidenceIds: [item.id],
      },
    ]
  })
}
