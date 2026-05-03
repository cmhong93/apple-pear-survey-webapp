import type { SurveyTemplate } from '@/types/survey'

export function runFormGuideAgent(template: SurveyTemplate) {
  return {
    agent: 'FormGuideAgent',
    templateId: template.id,
    hints: template.fields
      .filter((field) => field.required)
      .map((field) => `${field.label}은(는) 제출 전에 입력해야 합니다.`),
  }
}
