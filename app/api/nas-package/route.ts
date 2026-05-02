import { NextResponse } from 'next/server'
import { createNasPackageManifest } from '@/lib/nasPackage'
import type { MediaArtifact } from '@/types/media'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    media?: MediaArtifact[]
    surveyMonth?: string
    surveyorId?: string
  }

  const manifest = createNasPackageManifest(
    body.media ?? [],
    body.surveyMonth ?? '2026-05',
    body.surveyorId ?? 'S01',
  )

  return NextResponse.json({ ok: true, manifest })
}
