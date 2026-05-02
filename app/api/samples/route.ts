import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { readSampleMaster } from '@/lib/googleSheets'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ ok: false, message: 'Unauthorized.' }, { status: 401 })
  }

  const samples = await readSampleMaster()
  const assignedSamples =
    session.role === 'admin'
      ? samples
      : samples.filter((sample) => sample.assignedSurveyorId === session.surveyorId)

  return NextResponse.json({
    ok: true,
    source: 'mock-or-sheets-stub',
    user: {
      role: session.role,
      userId: session.userId,
      surveyorId: session.surveyorId,
    },
    samples: assignedSamples,
  })
}
