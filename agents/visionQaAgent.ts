import type { MediaArtifact } from '@/types/media'
import type { QaFinding } from '@/types/qa'

export async function runVisionQaAgent(media: MediaArtifact[] = []): Promise<QaFinding[]> {
  if (!process.env.GEMINI_API_KEY) {
    return [
      {
        code: 'vision_qa_stub',
        message: `Gemini Vision QA is stubbed. ${media.length} media artifacts queued for future review.`,
        severity: 'info',
      },
    ]
  }

  return [
    {
      code: 'vision_qa_not_implemented',
      message: 'Gemini API key is configured, but Vision QA integration is intentionally deferred.',
      severity: 'info',
    },
  ]
}
