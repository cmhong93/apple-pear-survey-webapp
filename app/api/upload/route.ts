import { NextResponse } from 'next/server'
import { uploadMediaArtifact } from '@/lib/googleDrive'
import type { MediaArtifact } from '@/types/media'

export async function POST(request: Request) {
  const artifact = (await request.json()) as MediaArtifact
  const result = await uploadMediaArtifact(artifact)
  return NextResponse.json({
    ok: true,
    mode: result.configured ? 'drive-configured-stub' : 'mock',
    originalDriveFileId: result.originalDriveFileId,
  })
}
