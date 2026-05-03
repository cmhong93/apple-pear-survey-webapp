import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isSheetsConfigError, readSampleMaster } from '@/lib/googleSheets'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ ok: false, message: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const samples = await readSampleMaster()
    const assignedSamples =
      session.role === 'admin'
        ? samples
        : samples.filter((sample) => sample.assignedSurveyorId === session.surveyorId)

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
        message: error instanceof Error ? error.message : 'Failed to read samples.',
      },
      { status: isSheetsConfigError(error) ? 500 : 502 },
    )
  }
}
