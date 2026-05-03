import type { SurveyField, SurveyTemplate } from '@/types/survey'

const growthScale = ['매우좋음', '좋음', '비슷', '나쁨', '매우나쁨'].map((label) => ({ label, value: label }))
const amountScale = ['매우많음', '많음', '비슷', '적음', '매우적음', '없음'].map((label) => ({ label, value: label }))
const comparisonScale = ['적음', '다소 적음', '비슷', '다소 많음', '많음'].map((label) => ({ label, value: label }))
const yesNoOptions = ['O', 'X'].map((label) => ({ label, value: label }))
const harvestTimingOptions = ['빠름', '비슷', '늦음'].map((label) => ({ label, value: label }))

const applePests = [
  '일소 피해',
  '열과 피해',
  '엽소 피해',
  '동녹',
  '밀 증상',
  '갈반병',
  '점무늬낙엽병',
  '탄저병',
  '부란병',
  '과수화상병',
  '진딧물',
  '노린재',
  '동녹/사비',
  '기타',
].map((label) => ({ label, value: label }))

const pearPests = [
  '열과',
  '과피얼룩',
  '흑성병',
  '적성병',
  '과수화상병',
  '복숭아순나방',
  '복숭아심식나방',
  '주경배나무이',
  '꼬마배나무이',
  '깍지벌레',
  '응애',
  '응애/진딧물류',
  '갈색날개매미충',
  '미국선녀벌레',
  '잎말이나방',
  '기타',
].map((label) => ({ label, value: label }))

function text(id: string, label: string, section: string, extra: Partial<SurveyField> = {}): SurveyField {
  return { id, label, section, type: 'text', ...extra }
}

function number(id: string, label: string, section: string, extra: Partial<SurveyField> = {}): SurveyField {
  return { id, label, section, type: 'number', inputMode: 'decimal', ...extra }
}

function date(id: string, label: string, section: string, extra: Partial<SurveyField> = {}): SurveyField {
  return { id, label, section, type: 'date', ...extra }
}

function textarea(id: string, label: string, section: string, extra: Partial<SurveyField> = {}): SurveyField {
  return { id, label, section, type: 'textarea', ...extra }
}

function select(
  id: string,
  label: string,
  section: string,
  options: Array<{ label: string; value: string }>,
  extra: Partial<SurveyField> = {},
): SurveyField {
  return { id, label, section, type: 'select', options, ...extra }
}

function checkbox(
  id: string,
  label: string,
  section: string,
  options: Array<{ label: string; value: string }>,
  extra: Partial<SurveyField> = {},
): SurveyField {
  return { id, label, section, type: 'checkbox', multiple: true, options, ...extra }
}

const cropApple = { condition: { target: 'crop' as const, equals: 'apple' } }
const cropPear = { condition: { target: 'crop' as const, equals: 'pear' } }
const varietyHongro = { condition: { target: 'variety' as const, includes: '홍로' } }

const baseInfoFields: SurveyField[] = [
  text('sample_id_confirm', 'ID', '기본 정보', { required: true }),
  text('farmer_name_confirm', '경작자', '기본 정보', { required: true }),
  text('contact_confirm', '연락처', '기본 정보', { required: true }),
  text('home_address_confirm', '자택주소', '기본 정보'),
  text('variety_confirm', '품종', '기본 정보', { required: true }),
  text('field_address_confirm', '필지주소', '기본 정보', { required: true }),
  checkbox('survey_target_type', '조사 여부', '기본 정보', [
    { label: '생육', value: '생육' },
    { label: '생산량', value: '생산량' },
  ]),
  select('field_trade_status', '포전거래 여부', '기본 정보', yesNoOptions),
  number('field_area_pyeong', '해당 필지 면적(평)', '기본 정보'),
  number('planted_tree_count', '재식 주수', '기본 정보'),
  number('planting_distance_row_m', '재식거리: 열간(세로, m)', '기본 정보'),
  number('planting_distance_tree_m', '재식거리: 주간(가로, m)', '기본 정보'),
  text('detailed_variety', '과수 세부 품종', '기본 정보'),
  text('training_system', '재배 수형', '기본 정보'),
  date('flowering_start_date', '개화 시작일', '개화·만개·적과·수확 정보'),
  select('flower_amount_vs_last_year', '착화량 전년 대비', '개화·만개·적과·수확 정보', comparisonScale),
  select('flower_amount_vs_normal', '착화량 평년 대비', '개화·만개·적과·수확 정보', comparisonScale),
  date('last_year_flowering_date', '전년 개화일', '개화·만개·적과·수확 정보'),
  date('normal_flowering_date', '평년 개화일', '개화·만개·적과·수확 정보'),
  date('full_bloom_date', '만개기', '개화·만개·적과·수확 정보'),
  date('last_year_full_bloom_date', '전년 만개일', '개화·만개·적과·수확 정보'),
  date('normal_full_bloom_date', '평년 만개일', '개화·만개·적과·수확 정보'),
  select('full_bloom_amount_vs_last_year', '만개량 전년 대비', '개화·만개·적과·수확 정보', comparisonScale),
  select('full_bloom_amount_vs_normal', '만개량 평년 대비', '개화·만개·적과·수확 정보', comparisonScale),
  date('thinning_complete_date_1', '적과완료일 1차', '개화·만개·적과·수확 정보'),
  date('thinning_complete_date_2', '적과완료일 2차', '개화·만개·적과·수확 정보'),
  date('thinning_complete_date_3', '적과완료일 3차', '개화·만개·적과·수확 정보'),
  date('harvest_expected_date_1', '수확예정일 1차', '개화·만개·적과·수확 정보'),
  date('harvest_expected_date_2', '수확예정일 2차', '개화·만개·적과·수확 정보'),
  date('harvest_expected_date_3', '수확예정일 3차', '개화·만개·적과·수확 정보'),
  textarea('base_special_note', '특이사항', '기본 정보'),
]

function growthCommon(month: '6' | '7' | '8' | '9'): SurveyField[] {
  const fields: SurveyField[] = [
    textarea(`growth_${month}_overall_condition`, '현재 사과/배 전반적인 생육 상태', '작황', { required: true }),
    select(`growth_${month}_condition_vs_last_year`, '전년 대비 작황', '작황', growthScale, { required: true }),
    select(`growth_${month}_condition_vs_normal`, '평년 대비 작황', '작황', growthScale, { required: true }),
  ]

  if (month === '9') {
    fields.push(select('growth_9_pest_incidence_rate', '생리장해·병해충 발생률', '생리장해·병해충', amountScale))
  } else {
    fields.push(select(`growth_${month}_pest_incidence`, '생리장해·병해충 발생 정도', '생리장해·병해충', amountScale))
  }

  fields.push(
    checkbox(`growth_${month}_apple_pests`, '사과 생리장해·병해충', '생리장해·병해충', applePests, cropApple),
    checkbox(`growth_${month}_pear_pests`, '배 생리장해·병해충', '생리장해·병해충', pearPests, cropPear),
  )
  return fields
}

const growthJuneFields: SurveyField[] = [
  number('tree_1_age_after_planting', '1번 과수 재식 후 연령', '조사 과수 정보'),
  number('tree_2_age_after_planting', '2번 과수 재식 후 연령', '조사 과수 정보'),
  number('tree_3_age_after_planting', '3번 과수 재식 후 연령', '조사 과수 정보'),
  text('apple_detailed_variety_june', '사과 세부 품종', '조사 과수 정보', cropApple),
  ...growthCommon('6'),
  textarea('growth_6_special_note_vs_last_year', '생육 관련 전년 대비 특이사항', '생리장해·병해충'),
  number('avg_fruit_count_normal', '한 그루당 평균 착과수: 평년', '예상 수확량'),
  number('avg_fruit_count_this_year', '한 그루당 평균 착과수: 올해', '예상 수확량'),
  number('avg_fruit_count_last_year', '한 그루당 평균 착과수: 작년', '예상 수확량'),
  number('expected_yield_2024_per_tree', '한 그루당 예상 생산량: 24년산', '예상 수확량'),
  number('expected_yield_2025_per_tree', '한 그루당 예상 생산량: 25년산', '예상 수확량'),
  number('box_unit_kg', '상자단위(kg)', '예상 수확량'),
  number('box_count', '상자개수', '예상 수확량'),
  number('yield_ton', '생산량(톤)', '예상 수확량'),
  number('yield_change_rate_vs_last_year', '전년 대비 생산량 증감률(%)', '예상 수확량'),
]

const growthJulyFields: SurveyField[] = [
  ...growthCommon('7'),
  textarea('growth_7_current_disorder', '현재 발생한 생육 이상 및 생리장해', '생리장해·병해충'),
  textarea('growth_7_possible_disorder', '발생 가능성이 있는 생육 이상 및 생리장해', '생리장해·병해충'),
  number('growth_7_avg_fruit_count_field', '올해 필지 평균 착과수', '적과 정도'),
  number('growth_7_thinning_vs_normal_percent', '평년 대비 적과 정도(%)', '적과 정도'),
  textarea('growth_7_thinning_reason', '적과 정도 이유', '적과 정도'),
  textarea('growth_7_thinning_etc', '기타', '적과 정도'),
  number('growth_7_yield_per_300_pyeong_prediction', '올해 300평당 수확량 예측', '예상 수확량 및 출하량'),
  number('growth_7_expected_yield_this_year', '올해 예상 생산량', '예상 수확량 및 출하량'),
  number('growth_7_actual_yield_last_year', '작년 실제 생산량', '예상 수확량 및 출하량'),
  number('growth_7_actual_yield_normal', '평년 실제 생산량', '예상 수확량 및 출하량'),
  number('growth_7_change_rate_vs_last_year', '전년 대비 증감률', '예상 수확량 및 출하량'),
  number('growth_7_change_rate_vs_normal', '평년 대비 증감률', '예상 수확량 및 출하량'),
  number('hongro_shipment_august', '홍로 출하량: 8월', '예상 수확량 및 출하량', varietyHongro),
  number('hongro_shipment_september', '홍로 출하량: 9월', '예상 수확량 및 출하량', varietyHongro),
  number('hongro_shipment_chuseok', '홍로 출하량: 추석성수기', '예상 수확량 및 출하량', varietyHongro),
  number('pear_shipment_september', '배 출하량: 9월', '예상 수확량 및 출하량', cropPear),
  number('pear_shipment_chuseok', '배 출하량: 추석성수기', '예상 수확량 및 출하량', cropPear),
  number('pear_shipment_after_peak', '배 출하량: 성수기 이후', '예상 수확량 및 출하량', cropPear),
  number('pear_ga_treatment_rate_july', '배 GA 처리 비중', '예상 수확량 및 출하량', cropPear),
]

const growthAugustFields: SurveyField[] = [
  ...growthCommon('8'),
  textarea('growth_8_weather_damage_note', '폭우·폭염 등 피해 특이사항', '생리장해·병해충'),
  select('growth_8_fruit_drop_damage', '낙과 피해 여부', '낙과 피해', yesNoOptions),
  number('growth_8_fruit_drop_area_rate', '낙과 피해 발생 면적 비중', '낙과 피해'),
  select('growth_8_fruit_drop_vs_last_year', '낙과량 전년 대비', '낙과 피해', comparisonScale),
  select('growth_8_fruit_drop_vs_normal', '낙과량 평년 대비', '낙과 피해', comparisonScale),
  number('growth_8_pesticide_spray_count_this_year', '올해 농약 살포 횟수, 5~7월', '병해충 방제'),
  select('growth_8_pesticide_spray_vs_last_year', '전년 대비 살포 정도', '병해충 방제', comparisonScale),
  number('growth_8_pesticide_spray_count_last_year', '전년 살포 횟수, 5~7월', '병해충 방제'),
  textarea('growth_8_pesticide_reason', '사유 등 기타', '병해충 방제'),
  date('growth_8_first_harvest_expected_date', '첫 수확 예정일', '수확·출하 예상 시기 및 예상 수확량'),
  select('growth_8_first_harvest_timing_vs_last_year', '전년 대비 첫 수확 예정일 시기', '수확·출하 예상 시기 및 예상 수확량', harvestTimingOptions),
  date('growth_8_expected_final_survey_date', '예상 최종 조사일', '수확·출하 예상 시기 및 예상 수확량'),
  textarea('growth_8_harvest_timing_reason', '수확 시기 관련 이유', '수확·출하 예상 시기 및 예상 수확량'),
  number('growth_8_variety_area_pyeong', '해당 품종 면적(평)', '수확·출하 예상 시기 및 예상 수확량'),
  number('growth_8_expected_yield_2025', '25년산 예상 생산량', '수확·출하 예상 시기 및 예상 수확량'),
  number('growth_8_actual_yield_2024', '24년산 실제 생산량', '수확·출하 예상 시기 및 예상 수확량'),
  number('growth_8_actual_yield_normal', '평년 실제 생산량', '수확·출하 예상 시기 및 예상 수확량'),
  textarea('growth_8_yield_difference_reason', '전·평년 대비 다른 이유', '수확·출하 예상 시기 및 예상 수확량'),
  number('growth_8_large_fruit_rate', '대과 비중', '품질·비상품과 비중'),
  number('growth_8_low_quality_rate', '저품위과 비중', '품질·비상품과 비중'),
  number('growth_8_nonmarketable_rate', '비상품과 비중', '품질·비상품과 비중'),
  number('growth_8_pear_ga_treatment_rate', '배 GA 처리 비중', '품질·비상품과 비중', cropPear),
  textarea('growth_8_shipping_rate_by_period', '출하량 시기별 비중', '품질·비상품과 비중'),
]

const growthSeptemberFields: SurveyField[] = [
  ...growthCommon('9'),
  textarea('growth_9_other_pests', '기타 병해충', '생리장해·병해충'),
  number('growth_9_variety_area_pyeong', '해당 품종 면적(평)', '올해 예상 생산량'),
  number('growth_9_expected_yield_2025', '25년산 예상 생산량', '올해 예상 생산량'),
  number('growth_9_actual_yield_2024', '24년산 실제 생산량', '올해 예상 생산량'),
  number('growth_9_actual_yield_normal', '평년 실제 생산량', '올해 예상 생산량'),
  textarea('growth_9_yield_difference_reason', '전·평년 대비 다른 이유', '올해 예상 생산량'),
  date('growth_9_first_harvest_expected_date', '첫 수확 예정일', '수확 예정 시기'),
  select('growth_9_first_harvest_timing_vs_last_year', '전년 대비 첫 수확 예정일 시기', '수확 예정 시기', harvestTimingOptions),
  date('growth_9_expected_final_survey_date', '예상 최종 조사일', '수확 예정 시기'),
  textarea('growth_9_harvest_timing_reason', '수확 예정 시기 이유', '수확 예정 시기'),
  number('growth_9_fruit_size_index_vs_last_year', '작년 과 크기를 100으로 볼 때 금년 과 크기', '평균 과실 크기 및 과실 크기별 비중'),
  number('growth_9_large_fruit_rate', '대과 비중', '평균 과실 크기 및 과실 크기별 비중'),
  number('growth_9_low_quality_rate', '저품위과 비중', '평균 과실 크기 및 과실 크기별 비중'),
  number('growth_9_nonmarketable_rate', '비상품과 비중', '평균 과실 크기 및 과실 크기별 비중'),
  textarea('growth_9_quality_difference_reason', '전·평년과 다른 이유', '평균 과실 크기 및 과실 크기별 비중'),
]

function fruitCountFields(): SurveyField[] {
  const fields: SurveyField[] = [
    select('partial_harvest_status', '일부 수확 여부', '착과수 조사', yesNoOptions),
    number('partial_harvest_amount_per_tree', '일부 수확량, 그루당 개수', '착과수 조사'),
  ]

  for (let tree = 1; tree <= 3; tree += 1) {
    for (let branch = 1; branch <= 30; branch += 1) {
      fields.push(number(`fruit_count_tree_${tree}_branch_${branch}`, `${tree}번 과수 원가지 ${branch} 착과수`, `${tree}번 과수`))
      fields.push(text(`fruit_count_tree_${tree}_branch_${branch}_note`, `${tree}번 과수 원가지 ${branch} 특이사항`, `${tree}번 과수`))
    }
    fields.push(number(`fruit_count_tree_${tree}_total`, `${tree}번 과수 합계`, `${tree}번 과수`))
  }

  return fields
}

function productionFields(): SurveyField[] {
  const fields: SurveyField[] = []
  for (let tree = 1; tree <= 3; tree += 1) {
    for (let index = 1; index <= 30; index += 1) {
      fields.push(text(`production_tree_${tree}_item_${index}`, `${tree}번 과수 반복 ${index} 개체`, `${tree}번 과수`))
      fields.push(number(`production_tree_${tree}_weight_${index}`, `${tree}번 과수 반복 ${index} 과중(g)`, `${tree}번 과수`))
      fields.push(text(`production_tree_${tree}_note_${index}`, `${tree}번 과수 반복 ${index} 특이사항`, `${tree}번 과수`))
    }
  }
  return fields
}

export const surveyTemplates: SurveyTemplate[] = [
  {
    id: 'farm-basic-info-2026',
    crop: 'all',
    version: '2026.1',
    title: '농가 기본 정보 조사',
    fields: baseInfoFields,
  },
  {
    id: 'growth-june-2026',
    crop: 'all',
    version: '2026.1',
    title: '생육조사 6월',
    fields: growthJuneFields,
  },
  {
    id: 'growth-july-2026',
    crop: 'all',
    version: '2026.1',
    title: '생육조사 7월',
    fields: growthJulyFields,
  },
  {
    id: 'growth-august-2026',
    crop: 'all',
    version: '2026.1',
    title: '생육조사 8월',
    fields: growthAugustFields,
  },
  {
    id: 'growth-september-2026',
    crop: 'all',
    version: '2026.1',
    title: '생육조사 9월',
    fields: growthSeptemberFields,
  },
  {
    id: 'fruit-count-2026',
    crop: 'all',
    version: '2026.1',
    title: '착과수 조사',
    fields: fruitCountFields(),
  },
  {
    id: 'production-2026',
    crop: 'all',
    version: '2026.1',
    title: '생산량 조사',
    fields: productionFields(),
  },
]

export function getSurveyTemplateById(templateId: string) {
  return surveyTemplates.find((template) => template.id === templateId)
}

export function getDefaultSurveyTemplate() {
  return surveyTemplates[0]
}
