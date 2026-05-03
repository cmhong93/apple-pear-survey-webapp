import { NextResponse } from 'next/server'
import { runPreSubmitQa } from '@/agents/qaOrchestrator'
import { readSampleMaster } from '@/lib/googleSheets'
import type { SurveySubmission } from '@/types/submission'

export async function POST(request: Request) {
  const submission = (await request.json()) as SurveySubmission
  const sample = submission.sampleId ? (await readSampleMaster()).find((item) => item.id === submission.sampleId) : undefined
  const qa = await runPreSubmitQa({ sample, submission })

  return NextResponse.json(qa)
}
