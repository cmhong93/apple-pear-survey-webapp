import type {
  GpsValidationCandidate,
  HelpDictionaryItem,
  PhotoAiCriterion,
  ValidationRule,
} from "@/types/survey";
import { fieldHelp2026 } from "@/data/fieldHelp2026";

const defaultHelp = (
  fieldId: string,
  questionName: string
): HelpDictionaryItem => ({
  fieldId,
  questionName,
  purpose: "조사표 원문 구조에 따라 현장 확인 내용을 기록하고 후속 검증에 사용합니다.",
  inputMethod: "조사표에 적힌 값을 원문 단위와 형식에 맞춰 입력합니다.",
  example: "예: 조사표 원문에 맞춰 입력",
  unit: "",
  cautions:
    "HWP/HWPX 자동 추출 또는 원문 레이아웃 대조가 필요한 기준일 수 있습니다.",
  relatedPhotoRequired: false,
  relatedGpsRequired: false,
  needsReview: true,
});

export const questionHelpDictionary: Record<string, HelpDictionaryItem> = {};

export const getQuestionHelp = (fieldId: string, questionName: string) =>
  fieldHelp2026[fieldId] ??
  questionHelpDictionary[fieldId] ??
  defaultHelp(fieldId, questionName);

type RawValidationRule = {
  fieldId: string;
  required: boolean;
  min: number | null;
  max: number | null;
  warningMin: number | null;
  warningMax: number | null;
  allowedOptions: string[];
  warningMessage: string;
  errorMessage: string;
  ruleType: string;
  needsReview: boolean;
};

const rawValidationRules = [
  rawRule("farm_id", true),
  rawRule("farmer_name", true),
  rawRule("farmer_contact", true, "inferred"),
  rawRule("plot_address", true),
  rawRule("survey_datetime", true),
  rawRule("surveyor_name", true),
  rawRule("crop", true, "confirmed", null, null, ["사과", "배"], false),
  rawRule("variety", true, "extracted", null, null, ["후지", "홍로", "신고"]),
  rawRule("growth_survey_yn", true, "extracted", null, null, ["O", "X"]),
  rawRule("production_survey_yn", true, "extracted", 0, null, ["O", "X"]),
  rawRule("standing_trade_yn", false, "extracted", null, null, ["O", "X"]),
  rawRule("plot_area_pyeong", true, "extracted", 0),
  rawRule("planted_tree_count", true, "extracted", 0),
  rawRule("row_spacing_m", true, "extracted", 0),
  rawRule("tree_spacing_m", true, "extracted", 0),
  rawRule("flowering_amount_vs_previous", false, "extracted", 0),
  rawRule("flowering_amount_vs_normal", false, "extracted", 0),
  rawRule("full_bloom_amount_vs_previous", false, "extracted", 0),
  rawRule("full_bloom_amount_vs_normal", false, "extracted", 0),
  rawRule("disorder_pest_occurrence_level", true, "extracted", 0),
  rawRule("sample_tree_ages", true, "extracted", 0),
  rawRule("avg_fruit_set_per_tree_normal", false, "extracted", 0),
  rawRule("avg_fruit_set_per_tree_current", true, "extracted", 0),
  rawRule("avg_fruit_set_per_tree_previous", false, "extracted", 0),
  rawRule("per_tree_expected_production", false, "extracted", 0),
  rawRule(
    "fruit_thinning_level_vs_normal",
    true,
    "inferred",
    0,
    null,
    [],
    true,
    50,
    150
  ),
  rawRule("yield_per_300_pyeong_expected_kg", true, "extracted", 0),
  rawRule("expected_production_ton", false, "extracted", 0),
  rawRule("ga_treatment_ratio_current", false, "extracted", 0, 100),
  rawRule("shipment_ratio_by_period_july", false, "extracted", 0, 100),
  rawRule("fruit_drop_damage_yn", true, "extracted", 0, null, ["O", "X"]),
  rawRule("fruit_drop_area_ratio", false, "extracted", 0, 100),
  rawRule("fruit_drop_amount_vs_previous", false, "extracted", 0, 100),
  rawRule("pesticide_spray_count_current", true, "extracted", 0),
  rawRule("pesticide_spray_count_previous", false, "extracted", 0),
  rawRule("pesticide_spray_reason", false, "extracted", 0),
  rawRule("first_harvest_expected_date", true, "extracted", 0),
  rawRule("current_variety_area_pyeong", true, "extracted", 0),
  rawRule("production_estimate_by_year", true, "extracted", 0),
  rawRule("marketability_ratio_by_grade", false, "extracted", 0, 100),
  rawRule("august_apple_quality", false, "extracted", 0),
  rawRule("september_expected_total_production", true, "extracted", 0),
  rawRule("september_harvest_timing", true, "extracted", 0),
  rawRule(
    "apple_average_fruit_size_index",
    false,
    "inferred",
    0,
    null,
    [],
    true,
    50,
    150
  ),
  rawRule("september_grade_ratio", false, "extracted", 0, 100),
  rawRule("partial_harvest_yn", true, "extracted", 0, null, ["O", "X"]),
  rawRule("partial_harvest_amount_per_tree", false, "extracted", 0),
  rawRule("production_fruit_set_by_branch", true, "extracted", 0),
  rawRule("production_weight_samples", true, "extracted", 0),
  rawRule("photo_tree", true, "confirmed", 0, null, [], false),
  rawRule("gps_latitude", true, "inferred", -90, 90, [], true, 33, 39),
  rawRule("gps_longitude", true, "inferred", -180, 180, [], true, 124, 132),
  rawRule("gps_altitude_m", false, "inferred", 0, null, [], true, -10, 2000),
] satisfies RawValidationRule[];

function rawRule(
  fieldId: string,
  required: boolean,
  ruleType = "extracted",
  min: number | null = null,
  max: number | null = null,
  allowedOptions: string[] = [],
  needsReview = true,
  warningMin: number | null = null,
  warningMax: number | null = null
): RawValidationRule {
  const hasNonNegativeMin = min === 0;

  return {
    fieldId,
    required,
    min,
    max,
    warningMin,
    warningMax,
    allowedOptions,
    warningMessage:
      "자료 확정 기준이 아니므로 값 입력 후 원문 또는 현장 메모와 대조 검토가 필요합니다.",
    errorMessage: hasNonNegativeMin
      ? "입력 형식 또는 선택지 기준이 맞지 않습니다. 연령·수량·면적·비중·생산량 항목은 0 이상의 값으로 입력해야 합니다."
      : "필수값이 누락되었거나 입력 형식이 맞지 않습니다.",
    ruleType,
    needsReview,
  };
}

const normalizeRuleType = (ruleType: string): ValidationRule["ruleType"] => {
  if (ruleType === "confirmed" || ruleType === "inferred") return ruleType;
  return "extracted";
};

export const validationRules: Record<string, ValidationRule> =
  Object.fromEntries(
    rawValidationRules.map((rule) => [
      rule.fieldId,
      {
        fieldId: rule.fieldId,
        required: rule.required,
        min: rule.min,
        max: rule.max,
        warningMin: rule.warningMin,
        warningMax: rule.warningMax,
        allowedOptions: rule.allowedOptions,
        warningMessage: rule.warningMessage,
        errorMessage: rule.errorMessage,
        ruleType: normalizeRuleType(rule.ruleType),
        needsReview: rule.needsReview,
      },
    ])
  );

export const minZeroRuleCount = rawValidationRules.filter(
  (rule) => rule.min === 0
).length;

export const negativeNumberAiValidationNotice =
  "음수 불가 문항의 음수 / 비중 문항의 0 미만 또는 100 초과 / 연령·수량·면적·비중·생산량 계열 값의 음수";

export const photoAiCriteria: Record<string, PhotoAiCriterion> = {
  photo_overview_1: photoCriterion("photo_overview_1", "전경 사진 1", [
    "과원 전체 위치와 주변 환경",
    "서로 다른 방향에서 촬영한 전경",
  ]),
  photo_overview_2: photoCriterion("photo_overview_2", "전경 사진 2", [
    "과원 전체 위치와 주변 환경",
    "전경 사진 1과 다른 방향의 전경",
  ]),
  photo_mygps660: photoCriterion(
    "photo_mygps660",
    "MYGPS-660 사진",
    ["MYGPS-660 화면", "위도·경도·고도 값", "판독 가능한 선명도"],
    true
  ),
  photo_overview: photoCriterion("photo_overview", "전경 사진", [
    "조사 대상 과원 전경",
    "주변 지형 또는 식재 상태",
  ]),
  photo_tree: photoCriterion("photo_tree", "과수 사진", [
    "조사 과수 1~3번 식별 가능",
    "나무 전체 또는 주요 수관",
  ]),
  photo_fixed_fruit: photoCriterion("photo_fixed_fruit", "고정개체 사진", [
    "고정개체 표식",
    "과실 또는 측정 대상",
  ]),
  photo_measurement_value: photoCriterion(
    "photo_measurement_value",
    "측정수치 사진",
    ["측정 기구", "숫자 표시부", "측정 대상 과실 또는 샘플"]
  ),
  photo_mygps_660: photoCriterion(
    "photo_mygps_660",
    "MYGPS-660 사진",
    ["MYGPS-660 장비 화면", "고도 또는 좌표 표시 후보", "촬영시각 메타데이터"],
    true
  ),
  photo_survey_context: photoCriterion(
    "photo_survey_context",
    "복장·조사상황 사진",
    ["조사원 또는 조사 상황", "필요 시 방제복·안전장비", "현장 작업 맥락"]
  ),
};

function photoCriterion(
  fieldId: string,
  photoType: string,
  mustShow: string[],
  needsReview = false
): PhotoAiCriterion {
  return {
    fieldId,
    photoType,
    purpose: "현장 증빙 사진을 수집하여 조사값과 조사 상황의 신뢰성을 확인합니다.",
    mustShow,
    aiChecks: [
      "사진 유형 적합성",
      "촬영 대상 식별 가능 여부",
      "입력값과 사진 내용 불일치 후보",
      "사진 또는 측정수치 OCR 판독값이 음수이면 재확인 필요로 분류",
    ],
    resultCategories: ["정상", "경고", "재촬영 권고", "관리자 확인 필요"],
    needsReview,
  };
}

export const gpsValidationCandidates: GpsValidationCandidate[] = [
  {
    id: "gps_latitude",
    title: "위도",
    checks: [
      "decimal degrees 형식",
      "전역 범위 -90~90",
      "국내 과원 후보 warning 33~39",
    ],
    toleranceCandidate: "좌표 허용 오차는 원문 미확정, 10~50m 후보는 검토 필요",
    needsReview: true,
  },
  {
    id: "gps_longitude",
    title: "경도",
    checks: [
      "decimal degrees 형식",
      "전역 범위 -180~180",
      "국내 과원 후보 warning 124~132",
    ],
    toleranceCandidate: "좌표 허용 오차는 원문 미확정, 10~50m 후보는 검토 필요",
    needsReview: true,
  },
  {
    id: "gps_altitude_m",
    title: "고도(m)",
    checks: ["숫자 형식", "단위 m", "MYGPS-660 사진 판독값과 입력값 비교"],
    toleranceCandidate: "허용 오차 미확정, 장비·촬영 환경별 수동 확인 필요",
    needsReview: true,
  },
  {
    id: "gps_parcel_address",
    title: "필지주소와 좌표 정합성 후보",
    checks: [
      "상세주소 원문 저장 없이 시군구 수준 후보만 비교",
      "지도 API 연동 전까지 자동 차단 금지",
    ],
    toleranceCandidate: "시군구 불일치 또는 수 km 이상 차이 후보는 리뷰",
    needsReview: true,
  },
];

export const schemaChangeRequestNotice =
  "스키마 변경 요청 있음: gps_accuracy_m 추가, 날짜 복합 구조, 낙과량 구조화 검토. 자동 반영하지 않음.";

export const reviewRequiredSummary =
  "기준 검토 필요: HWP/HWPX 자동 추출 문항, 날짜/순 구분, GPS 정확도 필드, 사진 최소 수량, 품목별 조건부 문항.";

export const handoffConnectionCounts = {
  help: Object.keys(questionHelpDictionary).length,
  validationRules: Object.keys(validationRules).length,
  aiCriteria: Object.keys(photoAiCriteria).length + gpsValidationCandidates.length,
};
