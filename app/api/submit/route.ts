import { NextResponse } from 'next/server'
import { appendSurveySubmission } from '@/lib/googleSheets'
import type { SurveySubmission } from '@/types/submission'

export async function POST(request: Request) {
  const submission = (await request.json()) as SurveySubmission
  const result = await appendSurveySubmission(submission)
  return NextResponse.json({
    ok: true,
    mode: result.configured ? 'sheets-configured-stub' : 'mock',
    rowId: result.rowId,
  })
}
