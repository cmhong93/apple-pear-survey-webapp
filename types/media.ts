import type { Coordinate } from './sample'

export type PhotoType = 'plot' | 'tree1' | 'tree2' | 'tree3' | 'mygps660_screen'

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
}

export interface WatermarkPayload {
  sampleId: string
  surveyMonth: string
  photoType: PhotoType
  address: string
  appGps?: Coordinate
  myGps660Coordinate?: Coordinate
  surveyorId: string
  timestamp: string
}
