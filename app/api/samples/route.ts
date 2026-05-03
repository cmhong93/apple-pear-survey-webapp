import { NextResponse } from 'next/server'
import { getSession, isTestSampleId, isTestSurveyorId } from '@/lib/auth'
import { isSheetsConfigError, readSampleMaster } from '@/lib/googleSheets'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ ok: false, message: '로그인이 필요합니다.' }, { status: 401 })
  }

  try {
    const samples = await readSampleMaster()
    const assignedSamples =
      session.role === 'admin'
        ? samples
        : samples.filter((sample) => {
            if (isTestSurveyorId(session.surveyorId)) {
              return sample.assignedSurveyorId === session.surveyorId && isTestSampleId(sample.id)
            }
            return sample.assignedSurveyorId === session.surveyorId
          })

    return NextResponse.json({
      ok: true,
      source: 'google-sheets-or-local-fallback',
      user: {
        role: session.role,
        userId: session.userId,
        surveyorId: session.surveyorId,
      },
      samples: assignedSamples,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        configurationError: isSheetsConfigError(error),
        message: error instanceof Error ? error.message : '표본 목록을 읽지 못했습니다.',
      },
      { status: isSheetsConfigError(error) ? 500 : 502 },
    )
  }
}
