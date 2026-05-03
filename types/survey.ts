import type { CropType } from './sample'

export type SurveyFieldType = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'boolean' | 'checkbox'

export interface SurveyCondition {
  target: 'crop' | 'variety' | 'surveyType' | 'field'
  fieldId?: string
  equals?: string | number | boolean
  includes?: string
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
  section?: string
  help?: string
  unit?: string
  options?: SurveyFieldOption[]
  condition?: SurveyCondition
  placeholder?: string
  multiple?: boolean
  repeatGroup?: string
  min?: number
  max?: number
  inputMode?: 'text' | 'numeric' | 'decimal'
}

export interface SurveyTemplate {
  id: string
  crop?: CropType | 'all'
  version: string
  title: string
  description?: string
  fields: SurveyField[]
}
