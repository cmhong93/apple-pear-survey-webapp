import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { runPreSubmitQa } from '@/agents/qaOrchestrator'
import { MESSAGES_KO } from '@/lib/koreanLabels'
import {
  appendGpsLog,
  appendMediaFiles,
  appendQaIssues,
  appendSurveyAnswers,
  appendSurveySubmission,
  isSheetsConfigError,
  readSampleMaster,
} from '@/lib/googleSheets'
import { canAccessSample, getSession } from '@/lib/auth'
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
  status?: 'draft' | 'submitted'
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
  const requestedStatus = payload.status === 'draft' ? 'draft' : 'submitted'

  const submission: SurveySubmission = {
    id: submissionId,
    sampleId: payload.sampleId,
    surveyorId: session.surveyorId,
    templateId: payload.templateId || `${payload.crop || 'field'}-2026-v1`,
    surveyType: payload.surveyType,
    status: requestedStatus,
    answers: payload.answers,
    media,
    appGps: payload.appGps,
    myGps660Coordinate: payload.myGps660Coordinate,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  }

  try {
    const sample = (await readSampleMaster()).find((item) => item.id === payload.sampleId)
    if (!sample) {
      return NextResponse.json({ ok: false, message: '표본 원장에서 해당 표본을 찾지 못했습니다.' }, { status: 404 })
    }
    if (!canAccessSample(session, sample.assignedSurveyorId)) {
      return NextResponse.json({ ok: false, message: '이 표본에 접근할 권한이 없습니다.' }, { status: 403 })
    }

    const qa = await runPreSubmitQa({ sample, submission })
    if (requestedStatus === 'submitted' && qa.blocked) {
      return NextResponse.json(
        {
          ok: false,
          message: '제출할 수 없습니다.',
          hardErrors: qa.hardErrors,
          warnings: qa.warnings,
        },
        { status: 400 },
      )
    }

    await appendSurveySubmission(submission)
    await appendSurveyAnswers(submissionId, payload.answers)
    await appendGpsLog(submission)
    if (media.length > 0) await appendMediaFiles(media)
    if (requestedStatus === 'submitted' && qa.issues.length > 0) await appendQaIssues(qa.issues)

    return NextResponse.json({
      ok: true,
      submissionId,
      qaIssueCount: qa.issues.length,
      findings: qa.findings,
      hardErrors: qa.hardErrors,
      warnings: qa.warnings,
      message: requestedStatus === 'draft' ? '임시저장 완료' : `제출 완료: ${submissionId}`,
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
