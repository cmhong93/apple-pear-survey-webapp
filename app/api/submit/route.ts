import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { runIssueGenerationAgent } from '@/agents/issueGenerationAgent'
import { runRuleValidationAgent } from '@/agents/ruleValidationAgent'
import { MESSAGES_KO } from '@/lib/koreanLabels'
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
  templateId?: string
  surveyType?: string
  answers: SurveyAnswer[]
  appGps?: Coordinate
  myGps660Coordinate?: Coordinate
  media?: MediaArtifact[]
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'surveyor' || !session.surveyorId) {
    return NextResponse.json({ ok: false, message: MESSAGES_KO.surveyorSessionRequired }, { status: 401 })
  }

  const payload = (await request.json()) as SubmitPayload
  if (!payload.sampleId) {
    return NextResponse.json({ ok: false, message: MESSAGES_KO.sampleIdRequired }, { status: 400 })
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
    templateId: payload.templateId || `${payload.crop || 'field'}-2026-v1`,
    surveyType: payload.surveyType,
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
      message: MESSAGES_KO.submitSaved,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : MESSAGES_KO.submitFailed
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
