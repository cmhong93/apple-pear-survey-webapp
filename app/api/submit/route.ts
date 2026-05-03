import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { runIssueGenerationAgent } from '@/agents/issueGenerationAgent'
import { runRuleValidationAgent } from '@/agents/ruleValidationAgent'
import {
  appendGpsLog,
  appendMediaFiles,
  appendQaIssues,
  appendSurveyAnswers,
  appendSurveySubmission,
  isSheetsConfigError,
} from '@/lib/googleSheets'
import { getSession } from '@/lib/auth'
import type { Coordinate } from '@/types/sample'
import type { SurveyAnswer, SurveySubmission } from '@/types/submission'
import type { MediaArtifact } from '@/types/media'

interface SubmitPayload {
  sampleId: string
  crop: string
  variety: string
  surveyMonth: string
  answers: SurveyAnswer[]
  appGps?: Coordinate
  myGps660Coordinate?: Coordinate
  media?: MediaArtifact[]
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'surveyor' || !session.surveyorId) {
    return NextResponse.json({ ok: false, message: 'Surveyor session required.' }, { status: 401 })
  }

  const payload = (await request.json()) as SubmitPayload
  if (!payload.sampleId) {
    return NextResponse.json({ ok: false, message: 'sampleId is required.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const submissionId = `sub_${Date.now()}_${randomUUID().slice(0, 8)}`
  const media = (payload.media ?? []).map((item) => ({
    ...item,
    submissionId,
  }))

  const submission: SurveySubmission = {
    id: submissionId,
    sampleId: payload.sampleId,
    surveyorId: session.surveyorId,
    templateId: `${payload.crop || 'field'}-2026-v1`,
    status: 'submitted',
    answers: payload.answers,
    media,
    appGps: payload.appGps,
    myGps660Coordinate: payload.myGps660Coordinate,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  }

  const findings = runRuleValidationAgent(submission)
  const issues = runIssueGenerationAgent(payload.sampleId, findings).map((issue) => ({
    ...issue,
    submissionId,
  }))

  try {
    await appendSurveySubmission(submission)
    await appendSurveyAnswers(submissionId, payload.answers)
    await appendGpsLog(submission)
    if (media.length > 0) await appendMediaFiles(media)
    if (issues.length > 0) await appendQaIssues(issues)

    return NextResponse.json({
      ok: true,
      submissionId,
      qaIssueCount: issues.length,
      message: 'Submission saved.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save submission.'
    return NextResponse.json(
      {
        ok: false,
        configurationError: isSheetsConfigError(error),
        message,
      },
      { status: isSheetsConfigError(error) ? 500 : 502 },
    )
  }
}
