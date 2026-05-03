import type { MediaArtifact } from '@/types/media'
import type { QaFinding } from '@/types/qa'

export async function runVisionQaAgent(media: MediaArtifact[] = []): Promise<QaFinding[]> {
  if (!process.env.GEMINI_API_KEY) {
    return [
      {
        code: 'vision_qa_stub',
        message: `사진 검수 보조 기능은 준비 중입니다. 사진 ${media.length}건이 향후 검수 대상으로 기록되었습니다.`,
        severity: 'info',
      },
    ]
  }

  return [
    {
      code: 'vision_qa_not_implemented',
      message: '사진 검수 보조 API 키는 설정되어 있으나, 실제 검수 연결은 이후 단계에서 적용됩니다.',
      severity: 'info',
    },
  ]
}
