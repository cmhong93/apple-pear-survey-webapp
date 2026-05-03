import type { MediaArtifact } from './media'
import type { Coordinate } from './sample'

export type SubmissionStatus = 'draft' | 'submitted' | 'qa_required' | 'approved' | 'rejected'

export interface SurveyAnswer {
  fieldId: string
  fieldLabel: string
  value: string | number | boolean | string[] | null
}

export interface SurveySubmission {
  id: string
  sampleId: string
  surveyorId: string
  templateId: string
  surveyType?: string
  status: SubmissionStatus
  answers: SurveyAnswer[]
  media: MediaArtifact[]
  appGps?: Coordinate
  myGps660Coordinate?: Coordinate
  submittedAt?: string
  createdAt: string
  updatedAt: string
}
