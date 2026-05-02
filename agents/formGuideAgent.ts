import type { SurveyTemplate } from '@/types/survey'

export function runFormGuideAgent(template: SurveyTemplate) {
  return {
    agent: 'FormGuideAgent',
    templateId: template.id,
    hints: template.fields
      .filter((field) => field.required)
      .map((field) => `${field.label} is required before submission.`),
  }
}
