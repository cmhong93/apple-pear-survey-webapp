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

export interface MyGps660ExtractionResult {
  extractedLat: number | null
  extractedLng: number | null
  confidence: number
  summaryKo: string
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY)
}

function getGeminiModel() {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash'
}

function parseJsonObject<T>(text: string) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0]) as T
  } catch {
    return null
  }
}

async function callGeminiVisionJson(input: GeminiVisionInput, prompt: string) {
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
    return { ok: false as const, status: response.status, text: '' }
  }

  const data = (await response.json()) as GeminiResponse
  return {
    ok: true as const,
    status: response.status,
    text: data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('\n') ?? '',
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

  const response = await callGeminiVisionJson(input, prompt)
  if (!response.ok) {
    return [
      {
        code: 'vision_qa_gemini_failed',
        message: `Gemini 사진 검수 호출에 실패했습니다. 상태 코드: ${response.status}`,
        severity: 'warning',
      },
    ]
  }

  const parsed = parseJsonObject<{
    passed?: boolean
    severity?: 'info' | 'warning' | 'error'
    summary_ko?: string
    issues?: string[]
  }>(response.text)
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

export async function extractMyGps660Coordinate(input: GeminiVisionInput): Promise<MyGps660ExtractionResult> {
  if (!isGeminiConfigured()) {
    return {
      extractedLat: null,
      extractedLng: null,
      confidence: 0,
      summaryKo: 'Gemini API 키가 없어 MyGPS660 좌표 판독을 실행하지 못했습니다.',
    }
  }

  const prompt = [
    '이 사진은 MyGPS660 또는 GPS 기기의 디스플레이입니다.',
    '화면에 표시된 위도와 경도 숫자를 읽어 JSON만 반환하세요.',
    '위도/경도를 명확히 읽지 못하면 extractedLat와 extractedLng를 null로 반환하세요.',
    'confidence는 0부터 1 사이 숫자로 반환하세요.',
    'JSON 형식: {"extractedLat":36.123456,"extractedLng":127.123456,"confidence":0.91,"summaryKo":"한국어 요약"}',
  ].join('\n')

  const response = await callGeminiVisionJson(input, prompt)
  if (!response.ok) {
    return {
      extractedLat: null,
      extractedLng: null,
      confidence: 0,
      summaryKo: `Gemini MyGPS660 좌표 판독 호출에 실패했습니다. 상태 코드: ${response.status}`,
    }
  }

  const parsed = parseJsonObject<{
    extractedLat?: number | string | null
    extractedLng?: number | string | null
    confidence?: number | string | null
    summaryKo?: string
  }>(response.text)
  if (!parsed) {
    return {
      extractedLat: null,
      extractedLng: null,
      confidence: 0,
      summaryKo: 'Gemini MyGPS660 좌표 판독 결과를 해석하지 못했습니다.',
    }
  }

  const lat = parsed.extractedLat === null || parsed.extractedLat === undefined ? null : Number(parsed.extractedLat)
  const lng = parsed.extractedLng === null || parsed.extractedLng === undefined ? null : Number(parsed.extractedLng)
  const confidence = parsed.confidence === null || parsed.confidence === undefined ? 0 : Number(parsed.confidence)

  return {
    extractedLat: Number.isFinite(lat) ? lat : null,
    extractedLng: Number.isFinite(lng) ? lng : null,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
    summaryKo: parsed.summaryKo || 'Gemini가 MyGPS660 화면 좌표를 판독했습니다.',
  }
}
