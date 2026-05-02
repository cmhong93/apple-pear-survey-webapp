import type { SurveyTemplate } from '@/types/survey'

const commonFields = [
  {
    id: 'survey_date',
    label: 'Survey date',
    type: 'date',
    required: true,
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
    id: 'tree_count',
    label: 'Observed tree count',
    type: 'number',
    required: true,
    unit: 'trees',
  },
  {
    id: 'disease_observed',
    label: 'Disease observed',
    type: 'boolean',
    required: true,
  },
  {
    id: 'disease_notes',
    label: 'Disease notes',
    type: 'textarea',
    condition: {
      fieldId: 'disease_observed',
      equals: true,
    },
  },
  {
    id: 'field_notes',
    label: 'Field notes',
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
