export type CropType = 'apple' | 'pear'

export type SampleStatus = 'pending' | 'in_progress' | 'submitted' | 'qa_issue' | 'approved' | 'rejected'

export interface Coordinate {
  latitude: number
  longitude: number
  accuracyMeters?: number
}

export interface Sample {
  id: string
  crop: CropType
  farmCode: string
  farmDisplayName: string
  address: string
  surveyMonth: string
  assignedSurveyorId: string
  status: SampleStatus
  expectedCoordinate?: Coordinate
}
