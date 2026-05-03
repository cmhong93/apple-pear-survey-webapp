import type { Coordinate } from './sample'

export type PhotoType =
  | 'plot_photo'
  | 'tree1_photo'
  | 'tree2_photo'
  | 'tree3_photo'
  | 'mygps660_screen'
  | 'damage_photo'
  | 'paper_form_photo'

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
  locationLabel: string
  appGps?: Coordinate
  myGps660Coordinate?: Coordinate
  surveyorId: string
  timestamp: string
}
