import type { HelpDictionaryItem } from "@/types/survey";

export type TrainingSystemHelpItem = {
  label: string;
  description: string;
  imageSrc?: string;
};

export const trainingSystemHelp: TrainingSystemHelpItem[] = [
  {
    label: "주간형",
    description: "중앙 줄기가 뚜렷하고 좌우 가지가 배치된 형태입니다.",
  },
  {
    label: "세장방추형",
    description: "세로로 길고 좁은 방추형 수관을 유지하는 형태입니다.",
  },
  {
    label: "다축형",
    description: "여러 축을 세워 수관을 분산시키는 사과 수형입니다.",
  },
  {
    label: "배상형",
    description: "중심부를 낮추고 바깥쪽으로 가지가 퍼지는 배 수형입니다.",
  },
  {
    label: "Y자형",
    description: "주요 가지가 양쪽으로 벌어져 Y자 형태를 이루는 배 수형입니다.",
  },
  {
    label: "방사상형",
    description: "중심에서 가지가 여러 방향으로 퍼지는 배 수형입니다.",
  },
  {
    label: "기타",
    description: "보기와 다른 형태이면 현장 특이사항에 함께 기록합니다.",
  },
  {
    label: "확인불가",
    description: "현장에서 수형 판별이 어려운 경우에 사용합니다.",
  },
];

export const appleTrainingSystemLabels = ["주간형", "세장방추형", "다축형", "기타"];
export const pearTrainingSystemLabels = ["배상형", "Y자형", "방사상형", "기타"];

export const getDetailedVarietyExample = (variety = "") => {
  if (variety.includes("홍로")) return "예시: 일반 홍로, 자홍 등";
  if (variety.includes("후지"))
    return "예시: 일반 후지, 미야비, 미시마, 후브락스, 로얄후지 등";
  if (variety.includes("신고")) return "예시: 일반 신고, 신화, 화산 등";
  return "예시: 홍로 - 일반 홍로, 자홍 등 / 후지 - 일반 후지, 미야비, 미시마, 후브락스, 로얄후지 등 / 신고 - 일반 신고, 신화, 화산 등";
};

export const getDetailedVarietyHelpExample = (variety = "") =>
  getDetailedVarietyExample(variety).replace(/^예시:\s*/, "");

export const getTrainingSystemHelpByCrop = (cropType = "") => {
  const labels = cropType.includes("사과")
    ? appleTrainingSystemLabels
    : cropType.includes("배")
    ? pearTrainingSystemLabels
    : [...appleTrainingSystemLabels, ...pearTrainingSystemLabels];

  const labelSet = new Set(labels);
  return trainingSystemHelp.filter((item) => labelSet.has(item.label));
};

const help = (
  fieldId: string,
  questionName: string,
  inputMethod: string,
  cautions: string,
  unit = "",
  needsReview = true
): HelpDictionaryItem => ({
  fieldId,
  questionName,
  purpose: "2026년 면접조사표 기준으로 현장 응답과 검증 근거를 수집합니다.",
  inputMethod,
  example: unit ? `숫자와 단위(${unit})를 확인해 입력` : "조사표 기준에 맞춰 입력",
  unit,
  cautions,
  relatedPhotoRequired: false,
  relatedGpsRequired: fieldId === "altitude_m" || fieldId === "altitude_source",
  needsReview,
});

export const fieldHelp2026: Record<string, HelpDictionaryItem> = {
  farm_id: {
    fieldId: "farm_id",
    questionName: "표본 ID",
    purpose: "표본리스트의 조사 대상 식별값을 확인합니다.",
    inputMethod: "표본리스트에서 자동으로 가져오며 조사원이 직접 수정하지 않습니다.",
    example: "표본리스트의 표본ID 그대로 표시",
    unit: "",
    cautions: "조사 대상 표본이 맞는지만 확인합니다.",
    relatedPhotoRequired: false,
    relatedGpsRequired: false,
    needsReview: false,
  },
  altitude_m: help(
    "altitude_m",
    "고도",
    "GPS, MYGPS-660, 사진 판독 또는 수동 입력값을 m 단위 숫자로 입력합니다.",
    "비정상 고도값은 경고만 표시하고 제출은 차단하지 않습니다.",
    "m"
  ),
  altitude_source: help(
    "altitude_source",
    "고도 출처",
    "앱 GPS, MYGPS-660, 사진 판독, 수동 입력 중 하나를 고릅니다.",
    "고도값이 있으면 출처 누락을 경고로 표시합니다."
  ),
  detailed_variety: {
    fieldId: "detailed_variety",
    questionName: "과수 세부 품종",
    purpose: "품목과 품종군을 구분해 후속 조사 문항과 검증 기준을 적용합니다.",
    inputMethod:
      "자유입력 항목입니다. 조사원이 농가 응답을 그대로 입력하고, 아래 내용은 입력 예시로만 참고합니다.",
    example:
      "홍로: 일반 홍로, 자홍 등 / 후지: 일반 후지, 미야비, 미시마, 후브락스, 로얄후지 등 / 신고: 일반 신고, 신화, 화산 등",
    unit: "",
    cautions:
      "최종 공식 교육자료 또는 발주처 최신 지침에서 세부 품종 예시가 확정되면 해당 목록으로 갱신합니다.",
    relatedPhotoRequired: false,
    relatedGpsRequired: false,
    needsReview: true,
  },
  tree_count_changed_reason: help(
    "tree_count_changed_reason",
    "재식주수 전년과 다른 이유",
    "전년 재식주수와 다를 때 사유를 서술합니다.",
    "전년 비교 원천 데이터가 없으므로 현재는 오류가 아닌 확인 항목으로 처리합니다."
  ),
  fruit_set_target_count_current: help(
    "fruit_set_target_count_current",
    "최종 착과수 - 올해 목표",
    "농가 응답 기준의 1그루당 개수를 입력합니다.",
    "과도값은 경고만 표시하고 제출은 차단하지 않습니다.",
    "개/그루"
  ),
  fruit_set_count_previous_year: help(
    "fruit_set_count_previous_year",
    "최종 착과수 - 전년",
    "농가 응답 기준의 1그루당 개수를 입력합니다.",
    "과도값은 경고만 표시하고 제출은 차단하지 않습니다.",
    "개/그루"
  ),
  fruit_set_count_normal_year: help(
    "fruit_set_count_normal_year",
    "최종 착과수 - 평년",
    "농가 응답 기준의 1그루당 개수를 입력합니다.",
    "과도값은 경고만 표시하고 제출은 차단하지 않습니다.",
    "개/그루"
  ),
  fruit_thinning_completion_dates: help(
    "fruit_thinning_completion_dates",
    "적과일(예정일)",
    "2026년 기준 1차와 2차만 입력합니다.",
    "3차 적과일은 별도 입력 필드가 아니라 특이사항에 기록합니다.",
    "",
    false
  ),
  expected_harvest_dates: help(
    "expected_harvest_dates",
    "수확예정일",
    "2026년 기준 1차와 2차만 입력합니다.",
    "3차 수확예정일은 별도 입력 필드가 아니라 특이사항에 기록합니다.",
    "",
    false
  ),
};

[
  "cold_damage_2026_rate",
  "cold_damage_2026_no_fruit_set_rate",
  "cold_damage_2026_quality_decline_rate",
  "cold_damage_2025_rate",
  "cold_damage_2025_no_fruit_set_rate",
  "cold_damage_2025_quality_decline_rate",
].forEach((fieldId) => {
  const questionNames: Record<string, string> = {
    cold_damage_2026_rate: "저온피해 2026년 - 피해비중",
    cold_damage_2026_no_fruit_set_rate: "저온피해 2026년 - 착과불능",
    cold_damage_2026_quality_decline_rate: "저온피해 2026년 - 품위저하",
    cold_damage_2025_rate: "저온피해 2025년 - 피해비중",
    cold_damage_2025_no_fruit_set_rate: "저온피해 2025년 - 착과불능",
    cold_damage_2025_quality_decline_rate: "저온피해 2025년 - 품위저하",
  };

  fieldHelp2026[fieldId] = help(
    fieldId,
    questionNames[fieldId],
    "저온피해 비율을 0~100 범위의 % 값으로 입력합니다.",
    "피해비중, 착과불능, 품위저하 간 합산 관계는 아직 검증하지 않습니다.",
    "%",
    true
  );
});
