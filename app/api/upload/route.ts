import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { appendMediaFiles } from '@/lib/googleSheets'
import { isDriveConfigError, uploadOriginalPhoto } from '@/lib/googleDrive'
import { getSession } from '@/lib/auth'
import { MESSAGES_KO, photoTypeLabelKo } from '@/lib/koreanLabels'
import type { PhotoType } from '@/types/media'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'surveyor' || !session.surveyorId) {
    return NextResponse.json({ ok: false, message: MESSAGES_KO.surveyorSessionRequired }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  const sampleId = String(formData.get('sampleId') ?? '')
  const photoType = String(formData.get('photoType') ?? '') as PhotoType

  if (!(file instanceof File) || !sampleId || !photoType) {
    return NextResponse.json({ ok: false, message: '사진 파일, 표본 ID, 사진유형이 필요합니다.' }, { status: 400 })
  }

  const mediaId = `media_${Date.now()}_${randomUUID().slice(0, 8)}`
  const safeFileName = `${sampleId}_${photoTypeLabelKo(photoType)}_${session.surveyorId}_${Date.now()}_${file.name}`.replace(
    /[^\w.\-가-힣]/g,
    '_',
  )

  try {
    const uploaded = await uploadOriginalPhoto(file, safeFileName)
    const artifact = {
      id: mediaId,
      sampleId,
      photoType,
      originalFileName: file.name,
      mimeType: uploaded.mimeType || file.type,
      sizeBytes: uploaded.size || file.size,
      capturedAt: new Date().toISOString(),
      originalDriveFileId: uploaded.fileId,
    }

    await appendMediaFiles([artifact])

    return NextResponse.json({
      ok: true,
      media: artifact,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : MESSAGES_KO.uploadFailed
    return NextResponse.json(
      {
        ok: false,
        driveNotConfigured: isDriveConfigError(error),
        message,
      },
      { status: isDriveConfigError(error) ? 503 : 502 },
    )
  }
}
