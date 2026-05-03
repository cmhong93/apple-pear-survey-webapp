import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { appendMediaFiles } from '@/lib/googleSheets'
import { isDriveConfigError, uploadOriginalPhotoBuffer } from '@/lib/googleDrive'
import { getSession } from '@/lib/auth'
import { MESSAGES_KO, photoTypeLabelKo } from '@/lib/koreanLabels'
import { extractMyGps660Coordinate, runGeminiVisionQa } from '@/lib/gemini'
import { createGeminiQaImage } from '@/lib/imageResize'
import type { GpsCrossCheckStatus, MediaArtifact, PhotoType } from '@/types/media'
import type { QaFinding } from '@/types/qa'

const COORDINATE_TOLERANCE = 0.00005
const MIN_MYGPS660_CONFIDENCE = 0.7

function parseOptionalNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const number = Number(text)
  return Number.isFinite(number) ? number : null
}

function compareCoordinates(
  manualLat: number | null,
  manualLng: number | null,
  extractedLat: number | null,
  extractedLng: number | null,
  confidence: number,
): { status: GpsCrossCheckStatus; message: string } {
  if (manualLat === null || manualLng === null) {
    return {
      status: 'unreadable',
      message: 'MyGPS660 수동 입력 좌표가 없어 사진 판독값과 대조할 수 없습니다.',
    }
  }

  if (extractedLat === null || extractedLng === null || confidence < MIN_MYGPS660_CONFIDENCE) {
    return {
      status: 'unreadable',
      message: '사진에서 MyGPS660 좌표를 판독하지 못했습니다. 화면이 선명하게 보이도록 다시 촬영해 주세요.',
    }
  }

  const matched =
    Math.abs(manualLat - extractedLat) < COORDINATE_TOLERANCE &&
    Math.abs(manualLng - extractedLng) < COORDINATE_TOLERANCE

  return matched
    ? {
        status: 'matched',
        message: '수동 입력한 MyGPS660 좌표와 사진 판독 좌표가 일치합니다.',
      }
    : {
        status: 'mismatch',
        message:
          '수동 입력한 GPS 좌표와 MyGPS660 화면 사진에서 판독한 좌표가 일치하지 않습니다. 좌표 입력값을 확인하거나 화면이 선명하게 보이도록 다시 촬영해 주세요.',
      }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'surveyor' || !session.surveyorId) {
    return NextResponse.json({ ok: false, message: MESSAGES_KO.surveyorSessionRequired }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  const sampleId = String(formData.get('sampleId') ?? '')
  const photoType = String(formData.get('photoType') ?? '') as PhotoType
  const manualLat = parseOptionalNumber(formData.get('manual_lat'))
  const manualLng = parseOptionalNumber(formData.get('manual_lng'))

  if (!(file instanceof File) || !sampleId || !photoType) {
    return NextResponse.json({ ok: false, message: '사진 파일, 표본 ID, 사진유형이 필요합니다.' }, { status: 400 })
  }

  const mediaId = `media_${Date.now()}_${randomUUID().slice(0, 8)}`
  const safeFileName = `${sampleId}_${photoTypeLabelKo(photoType)}_${session.surveyorId}_${Date.now()}_${file.name}`.replace(
    /[^\w.\-가-힣]/g,
    '_',
  )

  try {
    const originalBuffer = Buffer.from(await file.arrayBuffer())
    const uploaded = await uploadOriginalPhotoBuffer(
      originalBuffer,
      safeFileName,
      file.type || 'application/octet-stream',
      file.size,
    )

    let qaImage: Awaited<ReturnType<typeof createGeminiQaImage>> | null = null
    const resizeWarnings: QaFinding[] = []
    try {
      qaImage = await createGeminiQaImage(originalBuffer)
    } catch (error) {
      resizeWarnings.push({
        code: 'vision_qa_resize_failed',
        message: error instanceof Error ? error.message : 'Gemini 전송용 축소 이미지 생성에 실패했습니다.',
        severity: 'warning',
      })
    }

    let visionQaFindings: QaFinding[] = resizeWarnings
    let gpsCrossCheckStatus: GpsCrossCheckStatus = photoType === 'mygps660_screen' ? 'not_run' : 'not_applicable'
    let gpsCrossCheckMessage =
      photoType === 'mygps660_screen'
        ? 'MyGPS660 좌표 검증이 완료되지 않았습니다. 사진을 다시 업로드해 주세요.'
        : 'MyGPS660 크로스체크 대상 사진이 아닙니다.'
    let extractedMyGps660Coordinate: MediaArtifact['extractedMyGps660Coordinate']

    if (qaImage) {
      if (photoType === 'mygps660_screen') {
        const extracted = await extractMyGps660Coordinate({
          photoType,
          mimeType: qaImage.meta.mimeType,
          base64Image: qaImage.buffer.toString('base64'),
        })
        const crossCheck = compareCoordinates(
          manualLat,
          manualLng,
          extracted.extractedLat,
          extracted.extractedLng,
          extracted.confidence,
        )
        extractedMyGps660Coordinate = {
          lat: extracted.extractedLat,
          lng: extracted.extractedLng,
          confidence: extracted.confidence,
          summaryKo: extracted.summaryKo,
        }
        gpsCrossCheckStatus = crossCheck.status
        gpsCrossCheckMessage = crossCheck.message
        visionQaFindings = [
          {
            code: `mygps660_cross_check_${crossCheck.status}`,
            message: crossCheck.message,
            severity: crossCheck.status === 'matched' ? 'info' : 'error',
          },
        ]
      } else {
        visionQaFindings = await runGeminiVisionQa({
          photoType,
          mimeType: qaImage.meta.mimeType,
          base64Image: qaImage.buffer.toString('base64'),
        }).catch((error) => [
          {
            code: 'vision_qa_runtime_failed',
            message: error instanceof Error ? error.message : 'Gemini 사진 검수 실행에 실패했습니다.',
            severity: 'warning' as const,
          },
        ])
      }
    }

    const artifact: MediaArtifact = {
      id: mediaId,
      sampleId,
      photoType,
      originalFileName: file.name,
      mimeType: uploaded.mimeType || file.type,
      sizeBytes: uploaded.size || file.size,
      capturedAt: new Date().toISOString(),
      originalDriveFileId: uploaded.fileId,
      visionQaFindings,
      visionQaSummary: visionQaFindings.map((finding) => finding.message).join(' / '),
      geminiQaImageMeta: qaImage?.meta,
      manualMyGps660Coordinate:
        photoType === 'mygps660_screen'
          ? {
              lat: manualLat,
              lng: manualLng,
            }
          : undefined,
      extractedMyGps660Coordinate,
      gpsCrossCheckStatus,
      gpsCrossCheckMessage,
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
