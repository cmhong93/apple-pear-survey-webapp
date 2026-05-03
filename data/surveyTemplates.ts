import type { SurveyTemplate } from '@/types/survey'

const commonFields = [
  {
    id: 'survey_type',
    label: 'Survey type',
    type: 'select',
    required: true,
    options: [
      { label: 'Interview survey', value: 'interview' },
      { label: 'Growth survey', value: 'growth' },
      { label: 'Production survey', value: 'production' },
    ],
  },
  {
    id: 'growth_condition',
    label: 'Growth condition',
    type: 'select',
    required: true,
    options: [
      { label: 'Good', value: 'good' },
      { label: 'Average', value: 'average' },
      { label: 'Poor', value: 'poor' },
    ],
  },
  {
    id: 'pest_disease_status',
    label: 'Pest and disease status',
    type: 'textarea',
    required: true,
  },
  {
    id: 'fruit_count_note',
    label: 'Fruit count note',
    type: 'textarea',
  },
  {
    id: 'expected_yield_note',
    label: 'Expected yield note',
    type: 'textarea',
  },
  {
    id: 'special_note',
    label: 'Special note',
    type: 'textarea',
    placeholder: 'Record tablet survey notes from the field.',
  },
] satisfies SurveyTemplate['fields']

export const surveyTemplates: SurveyTemplate[] = [
  {
    id: 'apple-2026-v1',
    crop: 'apple',
    version: '2026.1',
    title: 'Apple field survey MVP',
    fields: commonFields,
  },
  {
    id: 'pear-2026-v1',
    crop: 'pear',
    version: '2026.1',
    title: 'Pear field survey MVP',
    fields: commonFields,
  },
]

export function getSurveyTemplateByCrop(crop: SurveyTemplate['crop']) {
  return surveyTemplates.find((template) => template.crop === crop)
}
