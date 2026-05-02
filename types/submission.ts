import type { MediaArtifact } from './media'
import type { Coordinate } from './sample'

export type SubmissionStatus = 'draft' | 'submitted' | 'needs_repair' | 'approved' | 'rejected'

export interface SurveyAnswer {
  fieldId: string
  value: string | number | boolean | null
}

export interface SurveySubmission {
  id: string
  sampleId: string
  surveyorId: string
  templateId: string
  status: SubmissionStatus
  answers: SurveyAnswer[]
  media: MediaArtifact[]
  appGps?: Coordinate
  myGps660Coordinate?: Coordinate
  submittedAt?: string
  createdAt: string
  updatedAt: string
}
