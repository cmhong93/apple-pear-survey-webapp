import type { Coordinate } from './sample'
import type { QaFinding } from './qa'

export type PhotoType =
  | 'plot_photo'
  | 'tree1_photo'
  | 'tree2_photo'
  | 'tree3_photo'
  | 'mygps660_screen'
  | 'damage_photo'
  | 'paper_form_photo'

export type GpsCrossCheckStatus = 'not_applicable' | 'matched' | 'mismatch' | 'unreadable' | 'not_run'

export interface GeminiQaImageMeta {
  mimeType: 'image/jpeg'
  width: number
  height: number
  maxLongSide: 1280
  jpegQuality: 72
  metadataRemoved: boolean
  byteSize: number
}

export interface MyGps660ExtractedCoordinate {
  lat: number | null
  lng: number | null
  confidence?: number
  summaryKo?: string
}

export interface MyGps660ManualCoordinate {
  lat: number | null
  lng: number | null
}

export interface MediaArtifact {
  id: string
  sampleId: string
  submissionId?: string
  photoType: PhotoType
  originalFileName: string
  mimeType: string
  sizeBytes: number
  capturedAt: string
  appGps?: Coordinate
  myGps660Coordinate?: Coordinate
  originalDriveFileId?: string
  watermarkedDriveFileId?: string
  visionQaFindings?: QaFinding[]
  visionQaSummary?: string
  geminiQaImageMeta?: GeminiQaImageMeta
  extractedMyGps660Coordinate?: MyGps660ExtractedCoordinate
  manualMyGps660Coordinate?: MyGps660ManualCoordinate
  gpsCrossCheckStatus?: GpsCrossCheckStatus
  gpsCrossCheckMessage?: string
}

export interface WatermarkPayload {
  sampleId: string
  surveyMonth: string
  photoType: PhotoType
  locationLabel: string
  appGps?: Coordinate
  myGps660Coordinate?: Coordinate
  surveyorId: string
  timestamp: string
}
