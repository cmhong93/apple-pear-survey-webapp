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
  cropLabel: string
  variety: string
  farmCode: string
  farmerName?: string
  phone?: string
  mobilePhone?: string
  province: string
  city: string
  town: string
  homeAddress?: string
  fieldAddress?: string
  originalFile?: string
  pnu?: string
  notes?: string
  surveyMonth: string
  assignedSurveyorId: string
  status: SampleStatus
  expectedCoordinate?: Coordinate
}
