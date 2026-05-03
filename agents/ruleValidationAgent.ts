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
const REQUIRED_PHOTO_TYPE_SET = new Set<PhotoType>(REQUIRED_PHOTO_TYPES)
const MEANINGLESS_NOTE_VALUES = new Set(['.', 'ㅇ', '모름', '없'])
const ALLOWED_EMPTY_NOTE_VALUES = new Set(['없음', '특이사항 없음'])

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

function numericAnswer(answer?: SurveyAnswer) {
  const value = answerValue(answer)
  if (!value) return undefined
  const numeric = Number(value.replace(/,/g, ''))
  return Number.isFinite(numeric) ? numeric : undefined
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

function isCommonSpecialNote(answer: SurveyAnswer) {
  if (answer.fieldId.startsWith('fruit_count_tree_') || answer.fieldId.startsWith('production_tree_')) return false
  return (
    answer.fieldId.includes('note') ||
    answer.fieldId.includes('reason') ||
    answer.fieldId.includes('other') ||
    answer.fieldLabel.includes('특이사항') ||
    answer.fieldLabel.includes('사유') ||
    answer.fieldLabel.includes('기타')
  )
}

function isNoneNote(value: string) {
  return ALLOWED_EMPTY_NOTE_VALUES.has(value)
}

function hasUsableNote(answers: SurveyAnswer[]) {
  return answers.some((answer) => {
    if (!isCommonSpecialNote(answer)) return false
    const value = answerValue(answer)
    return value && !MEANINGLESS_NOTE_VALUES.has(value)
  })
}

function hasAbnormalAnswer(answers: SurveyAnswer[]) {
  const abnormalWords = ['나쁨', '매우나쁨', '많음', '매우많음', '적음', '매우적음', '빠름', '늦음', '일소', '열과', '낙과', '과수화상병']
  return answers.some((answer) => abnormalWords.some((word) => answerValue(answer).includes(word)))
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

function validateRequiredAnswers(hardErrors: QaFinding[], answers: SurveyAnswer[]) {
  for (const answer of answers) {
    const value = answerValue(answer)
    if ((answer.required || answer.fieldLabel.endsWith('*')) && !value) {
      hardErrors.push(error(`missing_required_answer_${answer.fieldId}`, `${answer.fieldLabel.replace(/\s\*$/, '')} 필수값이 누락되었습니다.`))
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
    if (answer.fieldId.includes('_weight_') && numeric === 0) {
      hardErrors.push(error(`zero_weight_${answer.fieldId}`, `${answer.fieldLabel}은(는) 0g을 입력할 수 없습니다.`))
    }
    if (isRatioAnswer(answer) && (numeric < 0 || numeric > 100)) {
      hardErrors.push(error(`invalid_ratio_${answer.fieldId}`, `${answer.fieldLabel}은(는) 0~100 범위로 입력하세요.`))
    }
  }
}

function validatePlantingDensity(warnings: QaFinding[], answers: Map<string, SurveyAnswer>) {
  const area = numericAnswer(answers.get('field_area_pyeong'))
  const trees = numericAnswer(answers.get('planted_tree_count'))
  const rowDistance = numericAnswer(answers.get('planting_distance_row_m'))
  const treeDistance = numericAnswer(answers.get('planting_distance_tree_m'))
  if ([area, trees, rowDistance, treeDistance].some((value) => value === undefined)) return
  if (!area || !trees || !rowDistance || !treeDistance) return

  const expectedTrees = (area * 3.3058) / (rowDistance * treeDistance)
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

function validateTrainingSystem(hardErrors: QaFinding[], warnings: QaFinding[], answers: Map<string, SurveyAnswer>) {
  const appleTraining = answerValue(answers.get('training_system_apple'))
  const pearTraining = answerValue(answers.get('training_system_pear'))
  const training = appleTraining || pearTraining
  if (answers.has('training_system_apple') || answers.has('training_system_pear')) {
    if (!training) {
      hardErrors.push(error('missing_training_system', '재배 수형을 선택하세요.'))
    }
  }

  if (appleTraining === '기타' && !answerValue(answers.get('training_system_other_detail'))) {
    hardErrors.push(error('missing_training_system_other_detail', '기타 수형을 선택한 경우 기타 수형명 또는 설명을 입력하세요.'))
  }
  if (pearTraining === '기타' && !answerValue(answers.get('training_system_other_detail_pear'))) {
    hardErrors.push(error('missing_training_system_other_detail_pear', '기타 수형을 선택한 경우 기타 수형명 또는 설명을 입력하세요.'))
  }
  if (appleTraining === '확인불가' && !answerValue(answers.get('training_system_unknown_reason'))) {
    hardErrors.push(error('missing_training_system_unknown_reason', '재배 수형 확인불가를 선택한 경우 확인불가 사유를 입력하세요.'))
  }
  if (pearTraining === '확인불가' && !answerValue(answers.get('training_system_unknown_reason_pear'))) {
    hardErrors.push(error('missing_training_system_unknown_reason_pear', '재배 수형 확인불가를 선택한 경우 확인불가 사유를 입력하세요.'))
  }
  if (training === '기타' || training === '확인불가') {
    warnings.push(warning('training_system_photo_recommended', '재배 수형 확인을 위해 정면·측면 사진 2장 이상 촬영을 권장합니다.'))
  }
}

function validateSpecialNotes(hardErrors: QaFinding[], warnings: QaFinding[], answers: SurveyAnswer[]) {
  const hasAbnormal = hasAbnormalAnswer(answers)
  const hasAnyUsableNote = hasUsableNote(answers)

  for (const answer of answers) {
    if (!isCommonSpecialNote(answer)) continue
    const value = answerValue(answer)
    if (!value) {
      hardErrors.push(error(`missing_special_note_${answer.fieldId}`, `${answer.fieldLabel}은(는) 공란으로 둘 수 없습니다. 없으면 특이사항 없음을 입력하세요.`))
      continue
    }
    if (MEANINGLESS_NOTE_VALUES.has(value)) {
      hardErrors.push(error(`meaningless_special_note_${answer.fieldId}`, `${answer.fieldLabel}에 "${value}"만 입력할 수 없습니다. 구체적인 관찰 내용 또는 특이사항 없음을 입력하세요.`))
    }
    if (value.length < 5 && !isNoneNote(value)) {
      warnings.push(warning(`short_special_note_${answer.fieldId}`, `${answer.fieldLabel}이 너무 짧습니다. 현장 상황을 조금 더 구체적으로 입력하세요.`))
    }
    if (/\d{6}-\d{7}|\d{2,6}-\d{2,6}-\d{2,8}|\d{10,}/.test(value)) {
      hardErrors.push(error(`pii_in_special_note_${answer.fieldId}`, `${answer.fieldLabel}에 주민등록번호, 계좌번호, 긴 식별번호 등 민감정보를 입력하지 마세요.`))
    }
    if (value.includes('관리 안 함') || value.includes('상태 엉망')) {
      warnings.push(warning(`subjective_special_note_${answer.fieldId}`, `${answer.fieldLabel}은(는) 주관적 표현 대신 관찰 사실로 입력하세요.`))
    }
    if (isNoneNote(value) && hasAbnormal) {
      warnings.push(warning(`contradictory_special_note_${answer.fieldId}`, '작황 이상, 병해충, 피해 항목이 선택되어 있습니다. 특이사항 없음과 모순되지 않는지 확인하세요.'))
    }
    if (value.includes('조사불가') || value.includes('표본대체') || value.includes('조사목 변경') || value.includes('대체') || value.includes('훼손')) {
      warnings.push(warning(`admin_review_note_${answer.fieldId}`, '조사 불가, 표본 대체, 조사목 변경 또는 훼손 내용은 관리자 확인 대상입니다.'))
    }
    if (value.includes('과수화상병')) {
      warnings.push(warning(`fire_blight_admin_report_${answer.fieldId}`, '과수화상병 선택 또는 의심 내용은 즉시 관리자에게 보고하세요.'))
    }
  }

  const selectedOther = answers.some((answer) => answerValue(answer).split(',').some((value) => value.trim() === '기타'))
  if (selectedOther && !hasAnyUsableNote) {
    hardErrors.push(error('missing_other_detail', '기타 항목을 선택한 경우 특이사항 또는 기타 내용을 입력하세요.'))
  }
  if (hasAbnormal && !hasAnyUsableNote) {
    hardErrors.push(error('missing_abnormal_reason', '작황 이상, 병해충, 피해 항목이 있으면 원인과 피해 정도를 특이사항에 입력하세요.'))
  }
}

function validateHarvestAndRepeats(hardErrors: QaFinding[], warnings: QaFinding[], answers: Map<string, SurveyAnswer>) {
  if (answerValue(answers.get('partial_harvest_status')) === 'O' && !answerValue(answers.get('partial_harvest_amount_per_tree'))) {
    hardErrors.push(error('missing_partial_harvest_amount', '일부 수확이 있는 경우 일부 수확량, 그루당 개수를 입력하세요.'))
  }

  for (let tree = 1; tree <= 3; tree += 1) {
    let fruitCountTotal = 0
    let measuredFruitCount = 0
    let productionCount = 0

    for (let branch = 1; branch <= 30; branch += 1) {
      const countId = `fruit_count_tree_${tree}_branch_${branch}`
      const noteId = `fruit_count_tree_${tree}_branch_${branch}_note`
      const count = numericAnswer(answers.get(countId))
      if (count !== undefined) {
        measuredFruitCount += 1
        fruitCountTotal += count
      }
      if (count === 0 && !answerValue(answers.get(noteId))) {
        hardErrors.push(error(`missing_zero_fruit_count_note_${countId}`, `${tree}번 과수 원가지 ${branch} 착과수가 0이면 특이사항을 입력하세요.`))
      }
    }

    if (measuredFruitCount > 0 && fruitCountTotal === 0) {
      warnings.push(warning(`zero_fruit_count_total_tree_${tree}`, `${tree}번 과수 착과수 합계가 0입니다. 조사목 상태를 확인하세요.`))
    }

    for (let index = 1; index <= 30; index += 1) {
      const weightId = `production_tree_${tree}_weight_${index}`
      const noteId = `production_tree_${tree}_note_${index}`
      const weight = numericAnswer(answers.get(weightId))
      if (weight !== undefined && weight > 0) productionCount += 1
      if (weight === 0 && !answerValue(answers.get(noteId))) {
        hardErrors.push(error(`missing_zero_weight_note_${weightId}`, `${tree}번 과수 반복 ${index} 과중이 0g이면 특이사항을 입력하세요.`))
      }
    }

    if (productionCount > 0 && productionCount < 30) {
      warnings.push(warning(`production_count_under_30_tree_${tree}`, `${tree}번 과수 생산량 조사는 30개 반복 입력 원칙입니다. 30개 미만이면 사유를 입력하세요.`))
    }
  }
}

function validatePhotos(hardErrors: QaFinding[], submission: Partial<SurveySubmission>) {
  const media = submission.media ?? []
  const myGps660Media = media.find((item) => item.photoType === 'mygps660_screen')
  const uploadedPhotoTypes = new Set(
    media.filter((item) => item.originalDriveFileId || item.watermarkedDriveFileId).map((item) => item.photoType),
  )

  for (const photoType of REQUIRED_PHOTO_TYPE_SET) {
    if (!uploadedPhotoTypes.has(photoType)) {
      hardErrors.push(error(`missing_photo_${photoType}`, `${photoTypeLabelKo(photoType)} 업로드가 완료되지 않았습니다.`))
    }
  }

  if (!myGps660Media) return
  if (!myGps660Media.manualMyGps660Coordinate?.lat || !myGps660Media.manualMyGps660Coordinate?.lng) {
    hardErrors.push(error('missing_mygps660_manual_coordinate', 'MyGPS660 화면 사진 업로드 시 수동 입력 좌표가 필요합니다.'))
  }
  if (myGps660Media.gpsCrossCheckStatus === 'matched') return
  if (myGps660Media.gpsCrossCheckStatus === 'mismatch') {
    hardErrors.push(
      error(
        'mygps660_cross_check_mismatch',
        myGps660Media.gpsCrossCheckMessage ||
          '수동 입력한 GPS 좌표와 MyGPS660 화면 사진의 좌표가 일치하지 않습니다. 좌표 입력값을 확인하거나 다시 촬영해 주세요.',
      ),
    )
    return
  }
  if (myGps660Media.gpsCrossCheckStatus === 'unreadable') {
    hardErrors.push(
      error(
        'mygps660_cross_check_unreadable',
        myGps660Media.gpsCrossCheckMessage ||
          '사진에서 MyGPS660 좌표를 판독하지 못했습니다. 화면이 선명하게 보이도록 다시 촬영해 주세요.',
      ),
    )
    return
  }
  if (myGps660Media.gpsCrossCheckStatus === 'not_run' || !myGps660Media.gpsCrossCheckStatus) {
    hardErrors.push(
      error(
        'mygps660_cross_check_not_run',
        myGps660Media.gpsCrossCheckMessage || 'MyGPS660 좌표 검증이 완료되지 않았습니다. 사진을 다시 업로드해 주세요.',
      ),
    )
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
  validateTrainingSystem(hardErrors, warnings, answersById)
  validateSpecialNotes(hardErrors, warnings, answers)
  validateHarvestAndRepeats(hardErrors, warnings, answersById)
  validateGps(hardErrors, submission)
  validatePhotos(hardErrors, submission)

  return {
    hardErrors,
    warnings,
    canSubmit: hardErrors.length === 0,
  }
}
