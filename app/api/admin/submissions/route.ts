import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { MESSAGES_KO } from '@/lib/koreanLabels'
import { isSheetsConfigError, readSampleMaster, readSurveySubmissions } from '@/lib/googleSheets'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ ok: false, message: MESSAGES_KO.adminSessionRequired }, { status: 401 })
  }

  try {
    const [samples, submissions] = await Promise.all([readSampleMaster(), readSurveySubmissions()])
    return NextResponse.json({ ok: true, samples, submissions })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        configurationError: isSheetsConfigError(error),
        message: error instanceof Error ? error.message : '관리자 제출 목록을 읽지 못했습니다.',
      },
      { status: isSheetsConfigError(error) ? 500 : 502 },
    )
  }
}
