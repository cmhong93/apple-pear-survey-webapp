import type { CropType } from './sample'

export type SurveyFieldType = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'boolean'

export interface SurveyCondition {
  fieldId: string
  equals: string | number | boolean
}

export interface SurveyFieldOption {
  label: string
  value: string
}

export interface SurveyField {
  id: string
  label: string
  type: SurveyFieldType
  required?: boolean
  unit?: string
  options?: SurveyFieldOption[]
  condition?: SurveyCondition
  placeholder?: string
}

export interface SurveyTemplate {
  id: string
  crop: CropType
  version: string
  title: string
  fields: SurveyField[]
}
