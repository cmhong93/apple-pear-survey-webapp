import { REQUIRED_PHOTO_TYPES } from '@/data/constants'
import { photoTypeLabelKo } from '@/lib/koreanLabels'
import type { QaFinding } from '@/types/qa'
import type { SurveySubmission } from '@/types/submission'

export function runRuleValidationAgent(submission: Partial<SurveySubmission>): QaFinding[] {
  const findings: QaFinding[] = []

  if (!submission.appGps) {
    findings.push({
      code: 'missing_app_gps',
      message: '앱 GPS 증빙이 누락되었습니다.',
      severity: 'error',
    })
  }

  if (!submission.myGps660Coordinate) {
    findings.push({
      code: 'missing_mygps660',
      message: 'MyGPS660 좌표 증빙이 누락되었습니다.',
      severity: 'error',
    })
  }

  const providedPhotoTypes = new Set(submission.media?.map((item) => item.photoType) ?? [])
  for (const photoType of REQUIRED_PHOTO_TYPES) {
    if (!providedPhotoTypes.has(photoType)) {
      findings.push({
        code: `missing_photo_${photoType}`,
        message: `${photoTypeLabelKo(photoType)}이 누락되었습니다.`,
        severity: 'error',
      })
    }
  }

  const requiredAnswers =
    submission.answers?.filter((answer) => answer.required || answer.fieldLabel.endsWith('*')) ?? []
  for (const answer of requiredAnswers) {
    const value = Array.isArray(answer.value) ? answer.value.join('') : String(answer.value ?? '').trim()
    if (!value) {
      findings.push({
        code: `missing_required_answer_${answer.fieldId}`,
        message: `${answer.fieldLabel.replace(/\s\*$/, '')} 필수값이 누락되었습니다.`,
        severity: 'error',
      })
    }
  }

  return findings
}
