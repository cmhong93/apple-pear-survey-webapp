import { REQUIRED_PHOTO_TYPES } from '@/data/constants'
import { photoTypeLabelKo } from '@/lib/koreanLabels'
import type { PhotoType } from '@/types/media'
import type { QaFinding, RuleValidationResult } from '@/types/qa'
import type { Coordinate } from '@/types/sample'
import type { SurveyAnswer, SurveySubmission } from '@/types/submission'

const MONTH_DAY_PATTERN = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
const YEAR_MONTH_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DEFAULT_MYGPS660_LAT = 36
const DEFAULT_MYGPS660_LNG = 127

const DATE_FIELD_IDS = new Set([
  'flowering_start_date',
  'last_year_flowering_date',
  'normal_flowering_date',
  'full_bloom_date',
  'last_year_full_bloom_date',
  'normal_full_bloom_date',
  'thinning_complete_date_1',
  'thinning_complete_date_2',
  'thinning_complete_date_3',
  'harvest_expected_date_1',
  'harvest_expected_date_2',
  'harvest_expected_date_3',
  'growth_8_first_harvest_expected_date',
  'growth_8_expected_final_survey_date',
  'growth_9_first_harvest_expected_date',
  'growth_9_expected_final_survey_date',
])

const REQUIRED_PHOTO_TYPE_SET = new Set<PhotoType>(REQUIRED_PHOTO_TYPES)

function error(code: string, message: string): QaFinding {
  return { code, message, severity: 'error' }
}

function warning(code: string, message: string): QaFinding {
  return { code, message, severity: 'warning' }
}

function answerValue(answer?: SurveyAnswer) {
  if (!answer) return ''
  if (Array.isArray(answer.value)) return answer.value.join(', ').trim()
  return String(answer.value ?? '').trim()
}

function answerMap(answers?: SurveyAnswer[]) {
  return new Map((answers ?? []).map((answer) => [answer.fieldId, answer]))
}

function isDateAnswer(answer: SurveyAnswer) {
  return answer.fieldType === 'date' || DATE_FIELD_IDS.has(answer.fieldId)
}

function isNumberAnswer(answer: SurveyAnswer) {
  if (answer.fieldType === 'number') return true
  return /(_count|_rate|_percent|_pyeong|_m$|_kg|_ton|_yield|_weight_|_area_|amount|distance)/.test(answer.fieldId)
}

function isRatioAnswer(answer: SurveyAnswer) {
  return (
    /rate|percent/.test(answer.fieldId) ||
    answer.fieldLabel.includes('비중') ||
    answer.fieldLabel.includes('비율') ||
    answer.fieldLabel.includes('(%)')
  )
}

function isPresent(value: string) {
  return value.length > 0
}

function dateOrdinal(value: string) {
  const [month, day] = value.split('-').map(Number)
  return month * 100 + day
}

function pushDateOrderError(
  hardErrors: QaFinding[],
  answers: Map<string, SurveyAnswer>,
  earlierId: string,
  laterId: string,
) {
  const earlier = answers.get(earlierId)
  const later = answers.get(laterId)
  const earlierValue = answerValue(earlier)
  const laterValue = answerValue(later)
  if (!earlierValue || !laterValue) return
  if (!MONTH_DAY_PATTERN.test(earlierValue) || !MONTH_DAY_PATTERN.test(laterValue)) return
  if (dateOrdinal(earlierValue) > dateOrdinal(laterValue)) {
    hardErrors.push(
      error(
        `invalid_date_order_${earlierId}_${laterId}`,
        `${earlier?.fieldLabel ?? earlierId}은(는) ${later?.fieldLabel ?? laterId}보다 늦을 수 없습니다.`,
      ),
    )
  }
}

function validateCoordinate(
  hardErrors: QaFinding[],
  coordinate: Coordinate | undefined,
  label: string,
  codePrefix: string,
) {
  if (!coordinate) {
    hardErrors.push(error(`missing_${codePrefix}`, `${label}가 누락되었습니다.`))
    return
  }

  if (coordinate.latitude < 33 || coordinate.latitude > 39) {
    hardErrors.push(error(`invalid_${codePrefix}_latitude`, `${label} 위도는 33~39 범위여야 합니다.`))
  }
  if (coordinate.longitude < 124 || coordinate.longitude > 132) {
    hardErrors.push(error(`invalid_${codePrefix}_longitude`, `${label} 경도는 124~132 범위여야 합니다.`))
  }
}

function validateRequiredAnswers(hardErrors: QaFinding[], answers?: SurveyAnswer[]) {
  for (const answer of answers ?? []) {
    const value = answerValue(answer)
    if ((answer.required || answer.fieldLabel.endsWith('*')) && !isPresent(value)) {
      hardErrors.push(
        error(
          `missing_required_answer_${answer.fieldId}`,
          `${answer.fieldLabel.replace(/\s\*$/, '')} 필수값이 누락되었습니다.`,
        ),
      )
    }
  }
}

function validateDates(hardErrors: QaFinding[], answers: SurveyAnswer[]) {
  for (const answer of answers) {
    if (!isDateAnswer(answer)) continue
    const value = answerValue(answer)
    if (!value && !answer.required) continue
    if (value === 'MM-DD') {
      hardErrors.push(error(`invalid_date_placeholder_${answer.fieldId}`, `${answer.fieldLabel}에 MM-DD 예시값이 남아 있습니다.`))
      continue
    }
    if (!value && answer.required) {
      hardErrors.push(error(`missing_date_${answer.fieldId}`, `${answer.fieldLabel}을(를) 입력하세요.`))
      continue
    }
    if (YEAR_MONTH_DAY_PATTERN.test(value)) {
      hardErrors.push(error(`invalid_date_year_${answer.fieldId}`, `${answer.fieldLabel}은(는) MM-DD 형식만 허용합니다.`))
      continue
    }
    if (value && !MONTH_DAY_PATTERN.test(value)) {
      hardErrors.push(error(`invalid_date_format_${answer.fieldId}`, `${answer.fieldLabel}은(는) MM-DD 형식으로 입력하세요.`))
    }
  }
}

function validateDateOrder(hardErrors: QaFinding[], answers: Map<string, SurveyAnswer>) {
  pushDateOrderError(hardErrors, answers, 'flowering_start_date', 'full_bloom_date')
  pushDateOrderError(hardErrors, answers, 'last_year_flowering_date', 'last_year_full_bloom_date')
  pushDateOrderError(hardErrors, answers, 'normal_flowering_date', 'normal_full_bloom_date')
  pushDateOrderError(hardErrors, answers, 'full_bloom_date', 'thinning_complete_date_1')
  pushDateOrderError(hardErrors, answers, 'thinning_complete_date_1', 'thinning_complete_date_2')
  pushDateOrderError(hardErrors, answers, 'thinning_complete_date_2', 'thinning_complete_date_3')
  pushDateOrderError(hardErrors, answers, 'full_bloom_date', 'harvest_expected_date_1')
  pushDateOrderError(hardErrors, answers, 'harvest_expected_date_1', 'harvest_expected_date_2')
  pushDateOrderError(hardErrors, answers, 'harvest_expected_date_2', 'harvest_expected_date_3')
}

function validateNumbers(hardErrors: QaFinding[], answers: SurveyAnswer[]) {
  for (const answer of answers) {
    if (!isNumberAnswer(answer)) continue
    const value = answerValue(answer)
    if (!value) continue
    const numeric = Number(value.replace(/,/g, ''))
    if (!Number.isFinite(numeric)) {
      hardErrors.push(error(`invalid_number_${answer.fieldId}`, `${answer.fieldLabel}은(는) 숫자만 입력하세요.`))
      continue
    }
    if (numeric < 0) {
      hardErrors.push(error(`negative_number_${answer.fieldId}`, `${answer.fieldLabel}은(는) 음수를 입력할 수 없습니다.`))
    }
    if (isRatioAnswer(answer) && (numeric < 0 || numeric > 100)) {
      hardErrors.push(error(`invalid_ratio_${answer.fieldId}`, `${answer.fieldLabel}은(는) 0~100 범위로 입력하세요.`))
    }
  }
}

function validatePlantingDensity(warnings: QaFinding[], answers: Map<string, SurveyAnswer>) {
  const area = Number(answerValue(answers.get('field_area_pyeong')).replace(/,/g, ''))
  const trees = Number(answerValue(answers.get('planted_tree_count')).replace(/,/g, ''))
  const rowDistance = Number(answerValue(answers.get('planting_distance_row_m')).replace(/,/g, ''))
  const treeDistance = Number(answerValue(answers.get('planting_distance_tree_m')).replace(/,/g, ''))
  if (![area, trees, rowDistance, treeDistance].every(Number.isFinite)) return
  if (area <= 0 || trees <= 0 || rowDistance <= 0 || treeDistance <= 0) return

  const squareMeters = area * 3.3058
  const expectedTrees = squareMeters / (rowDistance * treeDistance)
  const ratio = trees / expectedTrees
  if (ratio < 0.5 || ratio > 1.8) {
    warnings.push(
      warning(
        'planting_density_check_needed',
        `필지 면적, 재식 주수, 재식거리 조합을 확인하세요. 입력값 기준 예상 주수는 약 ${Math.round(expectedTrees)}주입니다.`,
      ),
    )
  }
}

function validatePhotos(hardErrors: QaFinding[], submission: Partial<SurveySubmission>) {
  const uploadedPhotoTypes = new Set(
    (submission.media ?? [])
      .filter((item) => item.originalDriveFileId || item.watermarkedDriveFileId)
      .map((item) => item.photoType),
  )

  for (const photoType of REQUIRED_PHOTO_TYPE_SET) {
    if (!uploadedPhotoTypes.has(photoType)) {
      hardErrors.push(error(`missing_photo_${photoType}`, `${photoTypeLabelKo(photoType)} 업로드가 완료되지 않았습니다.`))
    }
  }
}

function validateGps(hardErrors: QaFinding[], submission: Partial<SurveySubmission>) {
  validateCoordinate(hardErrors, submission.appGps, '앱 GPS', 'app_gps')
  validateCoordinate(hardErrors, submission.myGps660Coordinate, 'MyGPS660 좌표', 'mygps660')

  const myGps = submission.myGps660Coordinate
  if (
    myGps &&
    Math.abs(myGps.latitude - DEFAULT_MYGPS660_LAT) < 0.000001 &&
    Math.abs(myGps.longitude - DEFAULT_MYGPS660_LNG) < 0.000001
  ) {
    hardErrors.push(error('default_mygps660_coordinate', 'MyGPS660 좌표가 기본 예시값입니다. 실제 좌표를 입력하세요.'))
  }
}

export function runRuleValidationAgent(submission: Partial<SurveySubmission>): RuleValidationResult {
  const hardErrors: QaFinding[] = []
  const warnings: QaFinding[] = []
  const answers = submission.answers ?? []
  const answersById = answerMap(answers)

  validateRequiredAnswers(hardErrors, answers)
  validateDates(hardErrors, answers)
  validateDateOrder(hardErrors, answersById)
  validateNumbers(hardErrors, answers)
  validatePlantingDensity(warnings, answersById)
  validateGps(hardErrors, submission)
  validatePhotos(hardErrors, submission)

  return {
    hardErrors,
    warnings,
    canSubmit: hardErrors.length === 0,
  }
}
