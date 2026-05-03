import 'server-only'

import type { PhotoType } from '@/types/media'
import type { QaFinding } from '@/types/qa'
import { photoTypeLabelKo } from './koreanLabels'

interface GeminiVisionInput {
  photoType: PhotoType
  mimeType: string
  base64Image: string
}

interface GeminiResponsePart {
  text?: string
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiResponsePart[]
    }
  }>
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY)
}

function getGeminiModel() {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash'
}

function parseJsonObject(text: string) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0]) as {
      passed?: boolean
      severity?: 'info' | 'warning' | 'error'
      summary_ko?: string
      issues?: string[]
    }
  } catch {
    return null
  }
}

export async function runGeminiVisionQa(input: GeminiVisionInput): Promise<QaFinding[]> {
  if (!isGeminiConfigured()) {
    return [
      {
        code: 'vision_qa_not_configured',
        message: 'Gemini API 키가 없어 사진 AI 검수는 건너뛰었습니다.',
        severity: 'info',
      },
    ]
  }

  const photoLabel = photoTypeLabelKo(input.photoType)
  const prompt = [
    '너는 충남 사과·배 현장조사 사진 검수 보조 AI다.',
    '사진을 보고 아래 JSON만 반환한다.',
    '최종 승인/반려 결정은 사람이 하며, 너는 보완 필요 여부만 보조 판단한다.',
    `기대 사진유형: ${photoLabel}`,
    '검수 기준: 사진유형 부합 여부, 심한 흐림, 과도한 가림/어두움, MyGPS660 화면 사진의 화면 포함 여부.',
    'JSON 형식: {"passed":true|false,"severity":"info|warning|error","summary_ko":"한국어 요약","issues":["한국어 이슈"]}',
    '명백히 사진유형이 다르거나 판독이 불가능하면 severity를 error로 둔다.',
  ].join('\n')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${getGeminiModel()}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY ?? '',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: input.mimeType || 'image/jpeg',
                  data: input.base64Image,
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    },
  )

  if (!response.ok) {
    return [
      {
        code: 'vision_qa_gemini_failed',
        message: `Gemini 사진 검수 호출에 실패했습니다. 상태 코드: ${response.status}`,
        severity: 'warning',
      },
    ]
  }

  const data = (await response.json()) as GeminiResponse
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('\n') ?? ''
  const parsed = parseJsonObject(text)
  if (!parsed) {
    return [
      {
        code: 'vision_qa_parse_failed',
        message: 'Gemini 사진 검수 결과를 해석하지 못했습니다.',
        severity: 'warning',
      },
    ]
  }

  return [
    {
      code: parsed.passed === false ? 'vision_qa_requires_review' : 'vision_qa_passed',
      message:
        parsed.summary_ko ||
        (parsed.passed === false ? `${photoLabel} 보완 검토가 필요합니다.` : `${photoLabel} 검수를 통과했습니다.`),
      severity: parsed.severity ?? (parsed.passed === false ? 'warning' : 'info'),
    },
    ...(parsed.issues ?? []).map((issue, index) => ({
      code: `vision_qa_issue_${index + 1}`,
      message: issue,
      severity: parsed.severity ?? 'warning',
    })),
  ]
}
