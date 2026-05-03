import 'server-only'

import sharp from 'sharp'
import type { GeminiQaImageMeta } from '@/types/media'

const MAX_LONG_SIDE = 1280
const JPEG_QUALITY = 72

export class ImageResizeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageResizeError'
  }
}

export async function createGeminiQaImage(originalBuffer: Buffer): Promise<{
  buffer: Buffer
  meta: GeminiQaImageMeta
}> {
  try {
    const pipeline = sharp(originalBuffer, { failOn: 'none' })
      .rotate()
      .resize({
        width: MAX_LONG_SIDE,
        height: MAX_LONG_SIDE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true })
    return {
      buffer: data,
      meta: {
        mimeType: 'image/jpeg',
        width: info.width,
        height: info.height,
        maxLongSide: MAX_LONG_SIDE,
        jpegQuality: JPEG_QUALITY,
        metadataRemoved: true,
        byteSize: data.byteLength,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '이미지 축소에 실패했습니다.'
    throw new ImageResizeError(message)
  }
}
