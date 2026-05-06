import type {
  InputType,
  PhotoSpec,
  RepeatGroup,
  SurveyField,
  SurveySchema,
  SurveyTab,
  TabId,
  ValidationCandidate,
} from "@/types/survey";

const visibleTabIds: TabId[] = [
  "farm-basic",
  "growth-june",
  "growth-july",
  "growth-august",
  "growth-september",
  "production",
];

const tabHelp: Record<TabId, string> = {
  "farm-basic":
    "표본리스트의 기본정보를 확인하고, 필지·과수·개화·만개·착과·저온피해·수확 예정 정보를 입력합니다.",
  interview:
    "조사 과수 정보, 전년·평년 대비 작황, 병해충·생리장해, 특이사항을 기록합니다.",
  "growth-june":
    "6월 생육 상태, 평균 착과수, 한 그루당 예상 생산량과 전년 대비 증감률을 입력합니다.",
  "growth-july":
    "7월 적과 정도, 300평당 수확량, 전체 생산량, 품목별 출하 비중 후보를 입력합니다.",
  "growth-august":
    "8월 낙과 피해, 방제 횟수, 수확 예정 시기, 품질·비중 정보를 입력합니다.",
  "growth-september":
    "9월 최종 생산량 예측, 수확 예정 시기, 과실 크기와 품질 비중을 입력합니다.",
  production:
    "일부 수확 여부와 생산량 실측 반복 항목을 입력합니다. 반복 실측은 아래 접이식 영역에서 관리합니다.",
};

const sourceTabs: SurveyTab[] = [
  {
    id: "farm-basic",
    label: "농가 기본정보",
    order: 1,
    help: tabHelp["farm-basic"],
  },
  {
    id: "interview",
    label: "면접조사",
    order: 2,
    help: tabHelp.interview,
  },
  {
    id: "growth-june",
    label: "생육조사 6월",
    order: 3,
    help: tabHelp["growth-june"],
  },
  {
    id: "growth-july",
    label: "생육조사 7월",
    order: 4,
    help: tabHelp["growth-july"],
  },
  {
    id: "growth-august",
    label: "생육조사 8월",
    order: 5,
    help: tabHelp["growth-august"],
  },
  {
    id: "growth-september",
    label: "생육조사 9월",
    order: 6,
    help: tabHelp["growth-september"],
  },
  {
    id: "production",
    label: "생산량조사",
    order: 7,
    help: tabHelp.production,
  },
];

type SourceField = {
  fieldId?: string;
  tabId: TabId;
  label: string;
  inputType: InputType;
  required: boolean;
  unit?: string;
  options?: string[];
  note?: string;
  sourceFile?: string;
  needsReview: boolean;
};

const canonicalFieldIds: Record<string, string> = {
  "farm-basic:ID": "farm_id",
  "farm-basic:표본 ID": "farm_id",
  "farm-basic:경작자": "farmer_name",
  "farm-basic:연락처": "farmer_contact",
  "farm-basic:자택주소": "home_address",
  "farm-basic:필지주소": "plot_address",
  "farm-basic:고도": "altitude_m",
  "farm-basic:고도 출처": "altitude_source",
  "farm-basic:조사일": "survey_datetime",
  "farm-basic:조사월": "survey_month",
  "farm-basic:조사원": "surveyor_name",
  "farm-basic:품목": "crop",
  "farm-basic:품종": "variety",
  "farm-basic:과수 세부 품종": "detailed_variety",
  "farm-basic:포전거래 여부": "standing_trade_yn",
  "farm-basic:해당필지면적": "plot_area_pyeong",
  "farm-basic:재식 주수": "planted_tree_count",
  "farm-basic:재식 주수 전년과 다른 이유": "tree_count_changed_reason",
  "farm-basic:재식 거리 - 열간(세로)": "row_spacing_m",
  "farm-basic:재식 거리 - 주간(가로)": "tree_spacing_m",
  "farm-basic:재배 수형": "training_system",
  "farm-basic:재배 수형 기타 설명": "training_system_other",
  "farm-basic:개화 시작일 - 올해": "bloom_start_current_date",
  "farm-basic:개화 시작일 - 전년": "bloom_start_previous_date",
  "farm-basic:개화 시작일 - 평년": "bloom_start_normal_date",
  "farm-basic:착화량 전년 대비": "flowering_amount_vs_previous",
  "farm-basic:착화량 평년 대비": "flowering_amount_vs_normal",
  "farm-basic:만개일 - 올해": "full_bloom_current_date",
  "farm-basic:만개일 - 전년": "full_bloom_previous_date",
  "farm-basic:만개일 - 평년": "full_bloom_normal_date",
  "farm-basic:만개량 전년 대비": "full_bloom_amount_vs_previous",
  "farm-basic:만개량 평년 대비": "full_bloom_amount_vs_normal",
  "farm-basic:최종 착과수 - 올해 목표": "fruit_set_target_count_current",
  "farm-basic:최종 착과수 - 전년": "fruit_set_count_previous_year",
  "farm-basic:최종 착과수 - 평년": "fruit_set_count_normal_year",
  "farm-basic:저온피해 2026년 - 피해비중": "cold_damage_2026_rate",
  "farm-basic:저온피해 2026년 - 착과불능": "cold_damage_2026_no_fruit_set_rate",
  "farm-basic:저온피해 2026년 - 품위저하": "cold_damage_2026_quality_decline_rate",
  "farm-basic:저온피해 2025년 - 피해비중": "cold_damage_2025_rate",
  "farm-basic:저온피해 2025년 - 착과불능": "cold_damage_2025_no_fruit_set_rate",
  "farm-basic:저온피해 2025년 - 품위저하": "cold_damage_2025_quality_decline_rate",
  "farm-basic:적과일(예정일) 1차": "fruit_thinning_completion_dates",
  "farm-basic:적과일(예정일) 2차": "fruit_thinning_completion_dates",
  "farm-basic:수확예정일 1차": "expected_harvest_dates",
  "farm-basic:수확예정일 2차": "expected_harvest_dates",
  "farm-basic:특이사항(기타)": "farm_basic_notes",
  "interview:조사 과수별 세부 품종": "sample_tree_ages",
  "interview:조사 과수별 과수 연령": "sample_tree_ages",
  "interview:현재 전반적인 생육 상태 - 전년 대비": "current_growth_condition_vs_previous",
  "interview:현재 전반적인 생육 상태 - 평년 대비": "current_growth_condition_vs_normal",
  "interview:생리장해·병해충 발생 정도": "disorder_pest_occurrence_level",
  "interview:사과 병해충/생리장해 종류": "apple_pest_types",
  "interview:배 병해충/생리장해 종류": "pear_pest_types",
  "interview:생육 관련 특이사항 및 기타": "interview_notes",
  "growth-june:한 그루당 평균 착과수 - 평년": "avg_fruit_set_per_tree_normal",
  "growth-june:한 그루당 평균 착과수 - 올해": "avg_fruit_set_per_tree_current",
  "growth-june:한 그루당 평균 착과수 - 작년": "avg_fruit_set_per_tree_previous",
  "growth-june:한 그루당 예상 생산량 - 24년산 상자단위": "per_tree_expected_production",
  "growth-june:한 그루당 예상 생산량 - 24년산 상자개수": "per_tree_expected_production",
  "growth-june:한 그루당 예상 생산량 - 24년산 생산량": "per_tree_expected_production",
  "growth-june:한 그루당 예상 생산량 - 25년산 상자단위": "per_tree_expected_production",
  "growth-june:한 그루당 예상 생산량 - 25년산 상자개수": "per_tree_expected_production",
  "growth-june:한 그루당 예상 생산량 - 25년산 생산량": "per_tree_expected_production",
  "growth-june:전년 대비 생산량 증감률": "per_tree_expected_production",
  "growth-july:올해 필지 평균 착과수": "avg_fruit_set_per_tree_current",
  "growth-july:평년 대비 적과 정도": "fruit_thinning_level_vs_normal",
  "growth-july:적과 정도 이유": "fruit_thinning_reason",
  "growth-july:올해 300평당 수확량 예측 - 올해": "yield_per_300_pyeong_expected_kg",
  "growth-july:올해 300평당 수확량 예측 - 작년": "yield_per_300_pyeong_expected_kg",
  "growth-july:올해 300평당 수확량 예측 - 평년": "yield_per_300_pyeong_expected_kg",
  "growth-july:전체 생산량 - 25년산 예상": "expected_production_ton",
  "growth-july:전체 생산량 - 24년산 실제": "expected_production_ton",
  "growth-july:전체 생산량 - 평년 실제": "expected_production_ton",
  "growth-july:배 전체 생산량 중 GA처리 비중": "ga_treatment_ratio_current",
  "growth-july:홍로 출하량 비중 - 8월": "shipment_ratio_by_period_july",
  "growth-july:홍로 출하량 비중 - 9월": "shipment_ratio_by_period_july",
  "growth-july:홍로 출하량 비중 - 추석성수기(9/23~10/4)": "shipment_ratio_by_period_july",
  "growth-july:배 출하량 - 9월/추석성수기/성수기 이후": "shipment_ratio_by_period_july",
  "growth-august:고온으로 인한 낙과 피해 여부": "fruit_drop_damage_yn",
  "growth-august:낙과 피해 발생 면적 비중": "fruit_drop_area_ratio",
  "growth-august:낙과량 전년 대비": "fruit_drop_amount_vs_previous",
  "growth-august:낙과량 평년 대비": "fruit_drop_amount_vs_previous",
  "growth-august:올해 농약 살포 횟수(5~7월)": "pesticide_spray_count_current",
  "growth-august:전년 살포 횟수(5~7월)": "pesticide_spray_count_previous",
  "growth-august:전년 대비 살포 정도": "pesticide_spray_reason",
  "growth-august:첫 수확 예정일": "first_harvest_expected_date",
  "growth-august:전년 대비 첫 수확 예정일 시기": "first_harvest_expected_date",
  "growth-august:예상 최종 조사일": "final_survey_expected_date",
  "growth-august:필지 전체 생산량 - 해당 품종 면적": "current_variety_area_pyeong",
  "growth-august:필지 전체 생산량 - 25년산 예상": "production_estimate_by_year",
  "growth-august:필지 전체 생산량 - 24년산 실제": "production_estimate_by_year",
  "growth-august:필지 전체 생산량 - 평년 실제": "production_estimate_by_year",
  "growth-august:대과 비중 - 올해/작년/평년": "marketability_ratio_by_grade",
  "growth-august:저품위과 비중 - 올해/작년/평년": "marketability_ratio_by_grade",
  "growth-august:비상품과(출하x, 가공용) 비중 - 올해/작년/평년": "marketability_ratio_by_grade",
  "growth-august:8월 출하 사과 품질 - 당도": "august_apple_quality",
  "growth-august:8월 출하 사과 품질 - 외관(모양, 색택)": "august_apple_quality",
  "growth-august:8월 출하 사과 품질 - 크기": "august_apple_quality",
  "growth-september:올해 전체 예상 생산량 - 해당 품종 면적": "september_expected_total_production",
  "growth-september:올해 전체 예상 생산량 - 25년산 예상": "september_expected_total_production",
  "growth-september:올해 전체 예상 생산량 - 24년산 실제": "september_expected_total_production",
  "growth-september:올해 전체 예상 생산량 - 평년 실제": "september_expected_total_production",
  "growth-september:첫 수확 예정일": "september_harvest_timing",
  "growth-september:전년 대비 첫 수확 예정일 시기": "september_harvest_timing",
  "growth-september:예상 최종 조사일": "september_harvest_timing",
  "growth-september:금년 과 크기 지수": "apple_average_fruit_size_index",
  "growth-september:대과 비중 - 올해/작년/평년": "september_grade_ratio",
  "growth-september:저품위과 비중 - 올해/작년/평년": "september_grade_ratio",
  "growth-september:비상품과(출하x, 가공용) 비중 - 올해/작년/평년": "september_grade_ratio",
  "production:일부 수확 여부": "partial_harvest_yn",
  "production:일부 수확량(그루당)": "partial_harvest_amount_per_tree",
  "production:원가지별 착과수 특이사항": "production_fruit_set_by_branch",
  "production:반복 개체 과중 특이사항": "production_weight_samples",
};

const sourceFields: SourceField[] = [
  {
    tabId: "farm-basic",
    label: "표본 ID",
    inputType: "text",
    required: true,
    sourceFile: "4. 면접조사표.hwpx; 면접조사지침서 PPTX slide 32",
    needsReview: true,
  },
  {
    tabId: "farm-basic",
    label: "경작자",
    inputType: "text",
    required: true,
    sourceFile: "4. 면접조사표.hwpx",
    needsReview: true,
  },
  {
    tabId: "farm-basic",
    label: "연락처",
    inputType: "text",
    required: true,
    sourceFile: "4. 면접조사표.hwpx",
    needsReview: true,
  },
  {
    tabId: "farm-basic",
    label: "자택주소",
    inputType: "textarea",
    required: false,
    sourceFile: "4. 면접조사표.hwpx",
    needsReview: true,
  },
  {
    tabId: "farm-basic",
    label: "필지주소",
    inputType: "textarea",
    required: true,
    sourceFile: "2026년 면접조사표.pdf",
    needsReview: true,
  },
  {
    tabId: "farm-basic",
    label: "고도",
    inputType: "number",
    required: false,
    unit: "m",
    note: "GPS, MYGPS-660 사진 판독 또는 현장 수동 입력값을 저장합니다.",
    sourceFile: "2026년 면접조사표.pdf",
    needsReview: false,
  },
  {
    tabId: "farm-basic",
    label: "고도 출처",
    inputType: "select",
    required: false,
    options: ["앱 GPS", "MYGPS-660", "사진 판독", "수동 입력"],
    note: "고도값의 출처를 구분해 추후 GPS 정합성 검증에 사용합니다.",
    sourceFile: "2026년 면접조사표.pdf",
    needsReview: false,
  },
  {
    tabId: "farm-basic",
    label: "조사일",
    inputType: "date",
    required: true,
    sourceFile: "동향 면접조사 HWPX; 생산량 조사표 HWPX",
    needsReview: true,
  },
  {
    tabId: "farm-basic",
    label: "조사월",
    inputType: "text",
    required: true,
    note: "표본 리스트의 조사월. 예: 202606",
    sourceFile: "sample master",
    needsReview: false,
  },
  {
    tabId: "farm-basic",
    label: "조사원",
    inputType: "text",
    required: true,
    sourceFile: "동향 면접조사 HWPX; 생산량 조사표 HWPX",
    needsReview: true,
  },
  {
    tabId: "farm-basic",
    label: "품목",
    inputType: "select",
    required: true,
    options: ["사과", "배"],
    note: "표본리스트의 품목입니다. 조사원이 직접 수정하지 않습니다.",
    sourceFile: "면접조사지침서 PPTX slide 12",
    needsReview: false,
  },
  {
    tabId: "farm-basic",
    label: "품종",
    inputType: "select",
    required: true,
    options: ["홍로", "후지", "신고"],
    note: "표본리스트의 품종입니다. 조사원이 직접 수정하지 않습니다.",
    sourceFile: "면접조사지침서 PPTX slide 12",
    needsReview: false,
  },
  {
    tabId: "farm-basic",
    label: "과수 세부 품종",
    inputType: "text",
    required: false,
    note:
      "예시: 홍로 - 일반 홍로, 자홍 등 / 후지 - 일반 후지, 미야비, 미시마, 후브락스, 로얄후지 등 / 신고 - 일반 신고, 신화, 화산 등.",
    sourceFile: "4. 면접조사표.hwpx; 생육조사지침서 PPTX slide 34",
    needsReview: true,
  },
  {
    tabId: "farm-basic",
    label: "포전거래 여부",
    inputType: "select",
    required: false,
    options: ["O", "X"],
    sourceFile: "4. 면접조사표.hwpx; 면접조사지침서 PPTX slide 32",
    needsReview: true,
  },
  {
    tabId: "farm-basic",
    label: "해당필지면적",
    inputType: "number",
    required: true,
    unit: "평",
    sourceFile: "4. 면접조사표.hwpx",
    needsReview: true,
  },
  {
    tabId: "farm-basic",
    label: "재식 주수",
    inputType: "number",
    required: true,
    unit: "주/해당필지",
    note: "벤 나무, 죽은 나무 제외.",
    sourceFile: "4. 면접조사표.hwpx; 생육조사지침서 PPTX slide 34",
    needsReview: true,
  },
  {
    tabId: "farm-basic",
    label: "재식 주수 전년과 다른 이유",
    inputType: "textarea",
    required: false,
    note: "전년 재식주수와 다를 때 사유 입력을 권고합니다. 필수 여부는 교육 전 확인 필요.",
    sourceFile: "2026년 면접조사표.pdf",
    needsReview: true,
  },
  {
    tabId: "farm-basic",
    label: "재식 거리 - 열간(세로)",
    inputType: "number",
    required: true,
    unit: "m",
    note: "3열 거리 ÷ 2로 산출.",
    sourceFile: "4. 면접조사표.hwpx; 생육조사지침서 PPTX slide 35",
    needsReview: true,
  },
  {
    tabId: "farm-basic",
    label: "재식 거리 - 주간(가로)",
    inputType: "number",
    required: true,
    unit: "m",
    note: "3주 거리 ÷ 2로 산출.",
    sourceFile: "4. 면접조사표.hwpx; 생육조사지침서 PPTX slide 35",
    needsReview: true,
  },
  {
    tabId: "farm-basic",
    label: "재배 수형",
    inputType: "select",
    required: false,
    options: [
      "주간형",
      "세장방추형",
      "다축형",
      "Y자형",
      "배상형",
      "방사상형",
      "기타",
    ],
    note: "오른쪽 도움말에서 수형별 간단 설명을 확인할 수 있습니다.",
    sourceFile: "4. 면접조사표.hwpx; 면접조사지침서 PPTX slides 69,72",
    needsReview: true,
  },
  {
    tabId: "farm-basic",
    label: "재배 수형 기타 설명",
    inputType: "text",
    required: false,
    sourceFile: "현장 입력 보조",
    needsReview: false,
  },
  ...[
    "개화 시작일 - 올해",
    "개화 시작일 - 전년",
    "개화 시작일 - 평년",
    "만개일 - 올해",
    "만개일 - 전년",
    "만개일 - 평년",
    "적과일(예정일) 1차",
    "적과일(예정일) 2차",
    "수확예정일 1차",
    "수확예정일 2차",
  ].map<SourceField>((label) => ({
    tabId: "farm-basic",
    label,
    inputType: "date",
    required: false,
    sourceFile: "4. 면접조사표.hwpx; 면접조사지침서 PPTX slide 32",
    needsReview: true,
  })),
  ...["착화량 전년 대비", "착화량 평년 대비", "만개량 전년 대비", "만개량 평년 대비"].map<SourceField>((label) => ({
    tabId: "farm-basic",
    label,
    inputType: "select",
    required: false,
    options: ["적음", "다소 적음", "비슷", "다소 많음", "많음"],
    sourceFile: "4. 면접조사표.hwpx",
    needsReview: true,
  })),
  ...[
    ["최종 착과수 - 올해 목표", "개/그루"],
    ["최종 착과수 - 전년", "개/그루"],
    ["최종 착과수 - 평년", "개/그루"],
  ].map<SourceField>(([label, unit]) => ({
    tabId: "farm-basic",
    label,
    inputType: "number",
    required: false,
    unit,
    note: "2026년 신규 항목입니다. 올해 목표값의 정의(농가 목표/조사원 추정/지정 과수 기준)는 교육 전 확인 필요.",
    sourceFile: "2026년 면접조사표.pdf",
    needsReview: true,
  })),
  ...[
    "저온피해 2026년 - 피해비중",
    "저온피해 2026년 - 착과불능",
    "저온피해 2026년 - 품위저하",
    "저온피해 2025년 - 피해비중",
    "저온피해 2025년 - 착과불능",
    "저온피해 2025년 - 품위저하",
  ].map<SourceField>((label) => ({
    tabId: "farm-basic",
    label,
    inputType: "number",
    required: false,
    unit: "%",
    sourceFile: "2026년 면접조사표.pdf",
    needsReview: true,
  })),
  {
    tabId: "farm-basic",
    label: "특이사항(기타)",
    inputType: "textarea",
    required: false,
    sourceFile: "4. 면접조사표.hwpx",
    needsReview: true,
  },
  {
    tabId: "interview",
    label: "조사 과수별 세부 품종",
    inputType: "text",
    required: false,
    note: "1번, 2번, 3번 과수 반복 입력 가능.",
    sourceFile: "6월 사과 HWPX",
    needsReview: true,
  },
  {
    tabId: "interview",
    label: "조사 과수별 과수 연령",
    inputType: "number",
    required: true,
    unit: "년",
    note: "사과 5년 이상, 배 7년 이상 권장/검증.",
    sourceFile: "6월 HWPX; 생육조사지침서 PPTX slides 44,45",
    needsReview: true,
  },
  ...["현재 전반적인 생육 상태 - 전년 대비", "현재 전반적인 생육 상태 - 평년 대비"].map<SourceField>((label) => ({
    tabId: "interview",
    label,
    inputType: "select",
    required: true,
    options: ["매우좋음", "좋음", "비슷", "나쁨", "매우나쁨"],
    sourceFile: "6~9월 동향 면접조사 HWPX",
    needsReview: true,
  })),
  {
    tabId: "interview",
    label: "생리장해·병해충 발생 정도",
    inputType: "select",
    required: false,
    options: ["매우많음", "많음", "비슷", "적음", "매우적음", "없음"],
    sourceFile: "6~9월 동향 면접조사 HWPX",
    needsReview: true,
  },
  {
    tabId: "interview",
    label: "사과 병해충/생리장해 종류",
    inputType: "select",
    required: false,
    options: [
      "일소 피해",
      "열과 피해",
      "엽소 피해",
      "동녹",
      "밀 증상",
      "갈반병",
      "점무늬낙엽병",
      "탄저병",
      "부란병",
      "과수화상병",
      "진딧물",
      "노린재",
      "기타",
    ],
    sourceFile: "6~9월 사과 동향 HWPX",
    needsReview: true,
  },
  {
    tabId: "interview",
    label: "배 병해충/생리장해 종류",
    inputType: "select",
    required: false,
    options: [
      "열과",
      "일소",
      "과피얼룩",
      "흑성병(검은별무늬병)",
      "적성병(붉은별무늬병)",
      "과수화상병",
      "복숭아순나방",
      "복숭아심식나방",
      "주경배나무이",
      "꼬마배나무이",
      "깍지벌레",
      "응애",
      "진딧물류",
      "갈색날개매미충",
      "미국선녀벌레",
      "잎말이나방",
      "기타",
    ],
    sourceFile: "6~9월 배 동향 HWPX",
    needsReview: true,
  },
  {
    tabId: "interview",
    label: "생육 관련 특이사항 및 기타",
    inputType: "textarea",
    required: false,
    note: "폭우, 폭염, 병해충 피해 등.",
    sourceFile: "6~9월 동향 면접조사 HWPX",
    needsReview: true,
  },
  ...[
    ["한 그루당 평균 착과수 - 평년", "개"],
    ["한 그루당 평균 착과수 - 올해", "개"],
    ["한 그루당 평균 착과수 - 작년", "개"],
    ["한 그루당 예상 생산량 - 24년산 상자단위", "kg"],
    ["한 그루당 예상 생산량 - 24년산 상자개수", "개"],
    ["한 그루당 예상 생산량 - 24년산 생산량", "톤"],
    ["한 그루당 예상 생산량 - 25년산 상자단위", "kg"],
    ["한 그루당 예상 생산량 - 25년산 상자개수", "개"],
    ["한 그루당 예상 생산량 - 25년산 생산량", "톤"],
    ["전년 대비 생산량 증감률", "%"],
  ].map<SourceField>(([label, unit]) => ({
    tabId: "growth-june",
    label,
    inputType: "number",
    required: false,
    unit,
    sourceFile: "6월 동향 면접조사 HWPX",
    needsReview: true,
  })),
  ...[
    ["올해 필지 평균 착과수", "개", "number"],
    ["평년 대비 적과 정도", "%", "number"],
    ["적과 정도 이유", "", "textarea"],
    ["올해 300평당 수확량 예측 - 올해", "kg/300평", "number"],
    ["올해 300평당 수확량 예측 - 작년", "kg/300평", "number"],
    ["올해 300평당 수확량 예측 - 평년", "kg/300평", "number"],
    ["전체 생산량 - 25년산 예상", "톤", "number"],
    ["전체 생산량 - 24년산 실제", "톤", "number"],
    ["전체 생산량 - 평년 실제", "톤", "number"],
    ["배 전체 생산량 중 GA처리 비중", "%", "number"],
    ["홍로 출하량 비중 - 8월", "%", "number"],
    ["홍로 출하량 비중 - 9월", "%", "number"],
    ["홍로 출하량 비중 - 추석성수기(9/23~10/4)", "%", "number"],
    ["배 출하량 - 9월/추석성수기/성수기 이후", "% 및 증감률", "textarea"],
  ].map<SourceField>(([label, unit, inputType]) => ({
    tabId: "growth-july",
    label,
    inputType: inputType as InputType,
    required: false,
    unit: unit || undefined,
    sourceFile: "7월 동향 면접조사 HWPX",
    needsReview: true,
  })),
  {
    tabId: "growth-august",
    label: "고온으로 인한 낙과 피해 여부",
    inputType: "select",
    required: false,
    options: ["O", "X"],
    sourceFile: "8월 동향 면접조사 HWPX",
    needsReview: true,
  },
  ...[
    ["낙과 피해 발생 면적 비중", "%", "number"],
    ["낙과량 전년 대비", "%", "number"],
    ["낙과량 평년 대비", "%", "number"],
    ["올해 농약 살포 횟수(5~7월)", "회", "number"],
    ["전년 살포 횟수(5~7월)", "회", "number"],
    ["전년 대비 살포 정도", "", "select"],
    ["첫 수확 예정일", "", "date"],
    ["전년 대비 첫 수확 예정일 시기", "", "select"],
    ["예상 최종 조사일", "", "date"],
    ["필지 전체 생산량 - 해당 품종 면적", "평", "number"],
    ["필지 전체 생산량 - 25년산 예상", "톤", "number"],
    ["필지 전체 생산량 - 24년산 실제", "톤", "number"],
    ["필지 전체 생산량 - 평년 실제", "톤", "number"],
    ["대과 비중 - 올해/작년/평년", "%", "textarea"],
    ["저품위과 비중 - 올해/작년/평년", "%", "textarea"],
    ["비상품과(출하x, 가공용) 비중 - 올해/작년/평년", "%", "textarea"],
    ["8월 출하 사과 품질 - 당도", "", "select"],
    ["8월 출하 사과 품질 - 외관(모양, 색택)", "", "select"],
    ["8월 출하 사과 품질 - 크기", "", "select"],
  ].map<SourceField>(([label, unit, inputType]) => ({
    tabId: "growth-august",
    label,
    inputType: inputType as InputType,
    required: false,
    unit: unit || undefined,
    options:
      label === "전년 대비 살포 정도"
        ? ["매우많음", "많음", "비슷", "적음", "매우적음"]
        : label === "전년 대비 첫 수확 예정일 시기"
        ? ["빠름", "비슷", "늦음"]
        : label.startsWith("8월 출하 사과 품질")
        ? ["좋음", "비슷", "나쁨"]
        : undefined,
    sourceFile: "8월 동향 면접조사 HWPX",
    needsReview: true,
  })),
  ...[
    ["올해 전체 예상 생산량 - 해당 품종 면적", "평", "number"],
    ["올해 전체 예상 생산량 - 25년산 예상", "톤", "number"],
    ["올해 전체 예상 생산량 - 24년산 실제", "톤", "number"],
    ["올해 전체 예상 생산량 - 평년 실제", "톤", "number"],
    ["첫 수확 예정일", "", "date"],
    ["전년 대비 첫 수확 예정일 시기", "", "select"],
    ["예상 최종 조사일", "", "date"],
    ["금년 과 크기 지수", "작년=100", "number"],
    ["대과 비중 - 올해/작년/평년", "%", "textarea"],
    ["저품위과 비중 - 올해/작년/평년", "%", "textarea"],
    ["비상품과(출하x, 가공용) 비중 - 올해/작년/평년", "%", "textarea"],
  ].map<SourceField>(([label, unit, inputType]) => ({
    tabId: "growth-september",
    label,
    inputType: inputType as InputType,
    required: false,
    unit: unit || undefined,
    options:
      label === "전년 대비 첫 수확 예정일 시기"
        ? ["빠름", "비슷", "늦음"]
        : undefined,
    sourceFile: "9월 동향 면접조사 HWPX",
    needsReview: true,
  })),
  {
    tabId: "production",
    label: "일부 수확 여부",
    inputType: "select",
    required: false,
    options: ["O", "X"],
    sourceFile: "(수정_조사표)사과,배_착과수.hwpx",
    needsReview: true,
  },
  {
    tabId: "production",
    label: "일부 수확량(그루당)",
    inputType: "number",
    required: false,
    unit: "개",
    sourceFile: "(수정_조사표)사과,배_착과수.hwpx",
    needsReview: true,
  },
  {
    tabId: "production",
    label: "원가지별 착과수 특이사항",
    inputType: "textarea",
    required: false,
    sourceFile: "(수정_조사표)사과,배_착과수.hwpx",
    needsReview: true,
  },
  {
    tabId: "production",
    label: "반복 개체 과중 특이사항",
    inputType: "textarea",
    required: false,
    sourceFile: "(조사표)사과,배_생산량.hwpx",
    needsReview: true,
  },
];

const sensitiveFieldNames = new Set([
  "경작자",
  "연락처",
  "자택주소",
  "필지주소",
  "조사원",
]);

const readOnlyFieldIds = new Set(["farm_id", "crop", "variety"]);

const calculatedFieldIds = new Set([
  "cold_damage_2026_rate",
  "cold_damage_2025_rate",
]);

const hiddenFieldIds = new Set(["survey_month", "surveyor_name", "crop"]);

const monthDayFieldIds = new Set([
  "bloom_start_normal_date",
  "full_bloom_normal_date",
]);

const noteByFieldId: Record<string, string> = {
  farm_id: "",
  farmer_name: "",
  farmer_contact: "",
  home_address: "",
  plot_address: "",
  variety: "",
  detailed_variety:
    "예시: 홍로 - 일반 홍로, 자홍 등 / 후지 - 일반 후지, 미야비, 미시마, 후브락스, 로얄후지 등 / 신고 - 일반 신고, 신화, 화산 등.",
  bloom_start_current_date: "",
  bloom_start_normal_date:
    "",
  full_bloom_current_date: "",
  full_bloom_normal_date:
    "",
  row_spacing_m: "숫자만 입력합니다. 0보다 작은 값은 입력할 수 없습니다.",
  tree_spacing_m: "숫자만 입력합니다. 0보다 작은 값은 입력할 수 없습니다.",
  fruit_set_target_count_current: "",
  fruit_set_count_previous_year: "",
  fruit_set_count_normal_year: "",
  cold_damage_2026_rate: "",
  cold_damage_2026_no_fruit_set_rate: "",
  cold_damage_2026_quality_decline_rate: "",
  cold_damage_2025_rate: "",
  cold_damage_2025_no_fruit_set_rate: "",
  cold_damage_2025_quality_decline_rate: "",
  farm_basic_notes:
    "특이사항이 있는 경우 입력하세요. 예: 병해충 발생 이력, 냉해·낙과 특이사항, 수형 혼재 등",
};

const validationByName: Record<string, ValidationCandidate> = {
  ID: {
    range: "표본리스트 자동값",
    warning: "표본리스트의 표본ID를 그대로 사용",
  },
  경작자: {
    range: "표본리스트 자동값",
    warning: "권한 있는 화면에서 원문 확인",
  },
  연락처: {
    range: "표본리스트 자동값",
    warning: "권한 있는 화면에서 원문 확인",
  },
  자택주소: {
    range: "표본리스트 자동값",
    warning: "권한 있는 화면에서 원문 확인",
  },
  필지주소: {
    range: "표본리스트 자동값",
    warning: "권한 있는 화면에서 원문 확인",
  },
  고도: {
    range: "숫자, 단위 m",
    warning: "앱 GPS, MYGPS-660, 사진 판독, 수동 입력 출처를 함께 확인",
  },
  "고도 출처": {
    range: "앱 GPS/MYGPS-660/사진 판독/수동 입력",
  },
  품목: {
    range: "사과/배",
    warning: "품목별 품종·병해충 선택지 분기 필요",
  },
  품종: {
    range: "사과: 홍로/후지, 배: 신고",
    warning: "홍로·후지를 모두 재배하면 품종별 조사표 분리 필요",
  },
  해당필지면적: {
    range: "숫자, 단위 평",
    warning: "300평당 수확량 산정 시 필지 전체 면적 재확인",
  },
  "재식 주수": {
    range: "숫자, 단위 주/해당필지",
    warning: "벤 나무, 죽은 나무 포함 시 경고",
  },
  "재식 주수 전년과 다른 이유": {
    range: "전년 재식주수와 다를 때 사유 입력 권고",
    warning: "조건부 필수 여부는 교육 전 확인 필요",
  },
  "재식 거리 - 열간(세로)": {
    range: "숫자, 단위 m",
    warning: "3열 거리 ÷ 2 산식 안내",
  },
  "재식 거리 - 주간(가로)": {
    range: "숫자, 단위 m",
    warning: "3주 거리 ÷ 2 산식 안내",
  },
  "최종 착과수 - 올해 목표": {
    range: "0 이상의 숫자, 단위 개/그루",
    warning: "올해 목표값의 기준 확인 필요",
  },
  "최종 착과수 - 전년": {
    range: "0 이상의 숫자, 단위 개/그루",
  },
  "최종 착과수 - 평년": {
    range: "0 이상의 숫자, 단위 개/그루",
  },
  "저온피해 2026년 - 피해비중": {
    range: "0~100%",
    warning: "피해비중과 세부 피해율 관계 기준 확인 필요",
  },
  "저온피해 2026년 - 착과불능": {
    range: "0~100%",
    warning: "피해비중과 세부 피해율 관계 기준 확인 필요",
  },
  "저온피해 2026년 - 품위저하": {
    range: "0~100%",
    warning: "피해비중과 세부 피해율 관계 기준 확인 필요",
  },
  "저온피해 2025년 - 피해비중": {
    range: "0~100%",
    warning: "피해비중과 세부 피해율 관계 기준 확인 필요",
  },
  "저온피해 2025년 - 착과불능": {
    range: "0~100%",
    warning: "피해비중과 세부 피해율 관계 기준 확인 필요",
  },
  "저온피해 2025년 - 품위저하": {
    range: "0~100%",
    warning: "피해비중과 세부 피해율 관계 기준 확인 필요",
  },
  "조사 과수별 과수 연령": {
    range: "사과 5년 이상, 배 7년 이상",
    warning: "기준 미달이면 과수 재선정 경고",
  },
  "한 그루당 평균 착과수 - 평년": {
    range: "숫자, 단위 개",
  },
  "한 그루당 평균 착과수 - 올해": {
    range: "숫자, 단위 개",
  },
  "한 그루당 평균 착과수 - 작년": {
    range: "숫자, 단위 개",
  },
  "평년 대비 적과 정도": {
    range: "숫자, 단위 %",
    warning: "0~200% 범위 경고 후보",
  },
  "배 전체 생산량 중 GA처리 비중": {
    range: "0~100%",
    warning: "배 전용",
  },
  "낙과 피해 발생 면적 비중": {
    range: "0~100%",
  },
  "올해 농약 살포 횟수(5~7월)": {
    range: "0 이상의 숫자, 단위 회",
  },
  "금년 과 크기 지수": {
    range: "작년=100 기준 숫자",
    warning: "사과 전용 후보",
  },
};

const fieldNameToId = (tabId: string, name: string) =>
  `${tabId}-${name}`
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");

const tabs: SurveyTab[] = sourceTabs
  .sort((a, b) => a.order - b.order)
  .filter((tab) => visibleTabIds.includes(tab.id));

const farmBasicFieldOrder = [
  "survey_datetime",
  "farm_id",
  "farmer_name",
  "farmer_contact",
  "home_address",
  "plot_address",
  "altitude_m",
  "altitude_source",
  "variety",
  "detailed_variety",
  "standing_trade_yn",
  "plot_area_pyeong",
  "row_spacing_m",
  "tree_spacing_m",
  "planted_tree_count",
  "tree_count_changed_reason",
  "training_system",
  "training_system_other",
  "bloom_start_current_date",
  "bloom_start_previous_date",
  "bloom_start_normal_date",
  "full_bloom_current_date",
  "full_bloom_previous_date",
  "full_bloom_normal_date",
  "flowering_amount_vs_previous",
  "flowering_amount_vs_normal",
  "full_bloom_amount_vs_previous",
  "full_bloom_amount_vs_normal",
  "fruit_set_target_count_current",
  "fruit_set_count_previous_year",
  "fruit_set_count_normal_year",
  "cold_damage_2026_rate",
  "cold_damage_2026_no_fruit_set_rate",
  "cold_damage_2026_quality_decline_rate",
  "cold_damage_2025_rate",
  "cold_damage_2025_no_fruit_set_rate",
  "cold_damage_2025_quality_decline_rate",
  "fruit_thinning_completion_dates",
  "expected_harvest_dates",
  "farm_basic_notes",
];

const farmBasicOrderIndex = new Map(
  farmBasicFieldOrder.map((fieldId, index) => [fieldId, index])
);

const fields: SurveyField[] = sourceFields
  .map((field) => {
    const resolvedFieldId =
      field.fieldId ??
      canonicalFieldIds[`${field.tabId}:${field.label}`] ??
      fieldNameToId(field.tabId, field.label);

    return {
      id: fieldNameToId(field.tabId, field.label),
      fieldId: resolvedFieldId,
      tabId: field.tabId,
      label: field.label,
      inputType: monthDayFieldIds.has(resolvedFieldId) ? "text" : field.inputType,
      required: field.required,
      unit: field.unit || undefined,
      options: field.options ?? [],
      note: noteByFieldId[resolvedFieldId] ?? field.note ?? undefined,
      sourceFile: field.sourceFile || undefined,
      needsReview: field.needsReview,
      sensitive: sensitiveFieldNames.has(field.label),
      validation: validationByName[field.label],
      readOnly:
        readOnlyFieldIds.has(resolvedFieldId) ||
        calculatedFieldIds.has(resolvedFieldId),
    };
  })
  .filter((field) => !hiddenFieldIds.has(field.fieldId))
  .sort((a, b) => {
    if (a.tabId !== b.tabId) return 0;
    if (a.tabId !== "farm-basic") return 0;

    const aIndex = farmBasicOrderIndex.get(a.fieldId) ?? 999;
    const bIndex = farmBasicOrderIndex.get(b.fieldId) ?? 999;
    if (aIndex !== bIndex) return aIndex - bIndex;

    return a.id.localeCompare(b.id);
  });

const photos: PhotoSpec[] = [
  {
    id: "photo_overview",
    label: "전경 사진",
    required: true,
    note: "재배지 전경 1장. 촬영시간·장소 포함.",
    sourceFile: "생육조사지침서 PPTX slide 62; 생산량조사지침서 PPTX slide 32",
  },
  {
    id: "photo_tree",
    label: "과수 사진",
    required: true,
    note: "조사과수 과수당 1장, 총 3장.",
    sourceFile: "생육조사지침서 PPTX slide 62; 생산량조사지침서 PPTX slide 32",
  },
  {
    id: "photo_fixed_fruit",
    label: "고정개체 사진",
    required: true,
    note: "생육: 고정개체 개체당 1장, 과수별 10장 총 30장.",
    sourceFile: "생육조사지침서 PPTX slide 62; 요약본 PPTX slide 4",
  },
  {
    id: "photo_measurement_value",
    label: "측정수치 사진",
    required: true,
    note: "종·횡경 또는 수확과중 수치가 보이게 촬영.",
    sourceFile: "생육조사지침서 PPTX slide 62; 생산량조사지침서 PPTX slides 32,37",
  },
  {
    id: "photo_mygps_660",
    label: "MYGPS-660 사진",
    required: false,
    note: "고도 측정 테스트 자료 기반. 장비명과 기준은 수동 확인 필요.",
    sourceFile: "0. 고도 측정 테스트.zip",
    needsReview: true,
  },
  {
    id: "photo_bank_request_signed",
    label: "계좌입금의뢰서 서명본",
    shortLabel: "계좌입금의뢰서",
    required: true,
    note:
      "계좌입금의뢰서 전체가 한 장에 모두 보이도록 촬영해 주세요. 서명 또는 확인란만 확대 촬영하지 말고, 문서 상단 제목부터 하단 서명란까지 전체가 보이도록 촬영해 주세요. 흐림, 잘림, 그림자, 빛 반사로 내용 확인이 어려운 경우 재촬영이 필요합니다.",
    sourceFile: "발주처 제출 필수 항목",
    needsReview: true,
    aiExcluded: true,
    adminReviewRequired: true,
  },
  {
    id: "photo_survey_context",
    label: "복장·조사상황 사진",
    required: true,
    note: "방제복 착용 사진. 조사원당/자료별 수량 표현 혼재.",
    sourceFile: "생육조사지침서 PPTX slides 20,62; 생산량조사지침서 PPTX slides 18,32",
    needsReview: true,
  },
];

const repeatGroups: RepeatGroup[] = [
  {
    id: "production_fruit_set_by_branch",
    tabId: "production",
    label: "원가지별 착과수",
    description:
      "1~3번 과수별 원가지 1~30 착과수를 배열 상태로 관리합니다. 초기에는 과수별 1행만 열고 필요 시 행을 추가합니다.",
    parentLabel: "과수",
    itemLabel: "원가지",
    parentCount: 3,
    maxRowsPerParent: 30,
    initialRowsPerParent: 1,
    needsReview: true,
    sourceFile: "(수정_조사표)사과,배_착과수.hwpx",
    fields: [
      {
        id: "fruitCount",
        label: "착과수",
        inputType: "number",
        unit: "개",
        required: true,
        validation: {
          range: "0 이상의 숫자",
          warning: "합계 자동계산 및 누락행 경고 후보",
        },
      },
      {
        id: "memo",
        label: "특이사항",
        inputType: "text",
      },
    ],
  },
  {
    id: "fixed_fruit_measurements",
    tabId: "production",
    label: "고정개체 종·횡경",
    description:
      "과수 1~3, 고정개체 1~10의 종경·횡경을 배열 상태로 관리합니다.",
    parentLabel: "과수",
    itemLabel: "고정개체",
    parentCount: 3,
    maxRowsPerParent: 10,
    initialRowsPerParent: 1,
    needsReview: true,
    sourceFile: "생육조사지침서 PPTX slides 54,57",
    fields: [
      {
        id: "longDiameter",
        label: "종경",
        inputType: "number",
        unit: "mm",
        validation: {
          range: "숫자, 단위 mm 후보",
          warning: "원문 단위 수동 확인 필요",
        },
      },
      {
        id: "crossDiameter",
        label: "횡경",
        inputType: "number",
        unit: "mm",
        validation: {
          range: "숫자, 단위 mm 후보",
          warning: "원문 단위 수동 확인 필요",
        },
      },
    ],
  },
  {
    id: "production_weight_samples",
    tabId: "production",
    label: "반복 개체 과중",
    description:
      "과수 1~3, 반복 개체 1~30 과중(g)을 배열 상태로 관리합니다.",
    parentLabel: "과수",
    itemLabel: "반복 개체",
    parentCount: 3,
    maxRowsPerParent: 30,
    initialRowsPerParent: 1,
    needsReview: true,
    sourceFile: "(조사표)사과,배_생산량.hwpx",
    fields: [
      {
        id: "weight",
        label: "과중",
        inputType: "number",
        unit: "g",
        required: true,
        validation: {
          range: "숫자, 단위 g",
          warning: "디지털저울 단위 g와 영점 조정 확인",
        },
      },
      {
        id: "memo",
        label: "특이사항",
        inputType: "text",
      },
    ],
  },
];

const stagePhotoSpecs: PhotoSpec[] = [
  {
    id: "photo_overview_1",
    label: "전경 사진 1",
    shortLabel: "전경",
    required: true,
    note: "과원 전체 위치와 주변 환경이 보이도록 서로 다른 방향에서 2컷 촬영해 주세요.",
    sourceFile: "농가기본정보조사 사진 요구사항",
  },
  {
    id: "photo_overview_2",
    label: "전경 사진 2",
    shortLabel: "전경",
    required: true,
    note: "과원 전체 위치와 주변 환경이 보이도록 서로 다른 방향에서 2컷 촬영해 주세요.",
    sourceFile: "농가기본정보조사 사진 요구사항",
  },
  {
    id: "photo_mygps660",
    label: "MYGPS-660 사진",
    shortLabel: "MYGPS660",
    required: true,
    note: "MYGPS-660 화면의 위도, 경도, 고도 값이 선명하게 보이도록 촬영해 주세요.",
    sourceFile: "농가기본정보조사 사진 요구사항",
    needsReview: true,
  },
  {
    id: "photo_bank_request_signed",
    label: "계좌입금의뢰서 사인본",
    shortLabel: "계좌입금의뢰서",
    required: true,
    note:
      "계좌입금의뢰서 전체가 한 장에 모두 보이도록 촬영해 주세요. 서명란만 확대 촬영하지 말고 문서 상단 제목부터 하단 서명란까지 전체가 보이도록 촬영해 주세요.",
    sourceFile: "농가기본정보조사 사진 요구사항",
    needsReview: true,
    aiExcluded: true,
    adminReviewRequired: true,
  },
  {
    id: "photo_tree",
    label: "과수 사진",
    required: true,
    note: "생육조사 또는 생산량조사 단계별 요구사항 확정 후 사용합니다.",
    sourceFile: "생육/생산량 사진 요구사항 준비중",
  },
  {
    id: "photo_fixed_fruit",
    label: "고정개체 사진",
    required: true,
    note: "생육조사 또는 생산량조사 단계별 요구사항 확정 후 사용합니다.",
    sourceFile: "생육/생산량 사진 요구사항 준비중",
  },
  {
    id: "photo_measurement_value",
    label: "측정수치 사진",
    required: true,
    note: "생육조사 또는 생산량조사 단계별 요구사항 확정 후 사용합니다.",
    sourceFile: "생육/생산량 사진 요구사항 준비중",
  },
  {
    id: "photo_survey_context",
    label: "복장·조사상황 사진",
    required: true,
    note: "생육조사 또는 생산량조사 단계별 요구사항 확정 후 사용합니다.",
    sourceFile: "생육/생산량 사진 요구사항 준비중",
    needsReview: true,
  },
];

export const surveySchema: SurveySchema = {
  tabs,
  fields,
  repeatGroups,
  photos: stagePhotoSpecs,
};

export const draftStorageKey = "survey-draft-BE-237";
