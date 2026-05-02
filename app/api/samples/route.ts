import { NextResponse } from 'next/server'
import { readSampleMaster } from '@/lib/googleSheets'

export async function GET() {
  const samples = await readSampleMaster()
  return NextResponse.json({ source: 'mock-or-sheets-stub', samples })
}
