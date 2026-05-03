import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isSheetsConfigError, readSampleMaster, readSurveySubmissions } from '@/lib/googleSheets'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ ok: false, message: 'Admin session required.' }, { status: 401 })
  }

  try {
    const [samples, submissions] = await Promise.all([readSampleMaster(), readSurveySubmissions()])
    return NextResponse.json({ ok: true, samples, submissions })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        configurationError: isSheetsConfigError(error),
        message: error instanceof Error ? error.message : 'Failed to read admin submissions.',
      },
      { status: isSheetsConfigError(error) ? 500 : 502 },
    )
  }
}
