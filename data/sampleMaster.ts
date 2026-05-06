export type RawSampleRow = Record<string, string>;

export type SampleMasterRecord = {
  sampleId: string;
  farmerName: string;
  phone: string;
  mobilePhone: string;
  homeAddress: string;
  plotAddress: string;
  detailAddress: string;
  crop: string;
  variety: string;
  surveyorId: string;
  surveyorName: string;
  administrativeRegion: string;
  status: string;
  surveyMonth: string;
  surveyCase: string;
  growthTarget: string;
  assignedTeam: string;
  pnu: string;
  raw: RawSampleRow;
};

export type SampleWorkbookResponse = {
  samples: SampleMasterRecord[];
  totalCount: number;
  columnCount: number;
  columns: string[];
  sheetName: string;
  access: {
    role: string;
    surveyorId: string;
    filtered: boolean;
  };
};

export const sampleFieldIdAliases: Record<string, string[]> = {
  farm_id: ["sample_id", "farm_id", "표본ID", "표본 ID", "ID"],
  farmer_name: ["farmer_name", "farmerName", "name", "농가명", "경작자", "이름"],
  farmer_contact: [
    "phone",
    "farmer_contact",
    "mobile_phone",
    "전화번호",
    "휴대전화",
    "연락처",
  ],
  home_address: ["home_address", "자택주소"],
  plot_address: ["field_address", "plot_address", "필지주소"],
  survey_datetime: ["survey_datetime", "조사일"],
  surveyor_name: ["surveyor_name", "surveyor_id", "조사원"],
  survey_month: ["survey_month", "survey_datetime"],
  crop: ["crop_type", "crop", "품목"],
  variety: ["variety_group", "variety", "품종", "detail_variety"],
  detailed_variety: ["detail_variety", "detailed_variety"],
  growth_survey_yn: ["growth_survey_yn", "생육조사 여부"],
  production_survey_yn: ["production_survey_yn"],
  standing_trade_yn: ["standing_trade_yn"],
  plot_area_pyeong: ["plot_area_pyeong"],
  planted_tree_count: ["planted_tree_count"],
  row_spacing_m: ["row_spacing_m"],
  tree_spacing_m: ["tree_spacing_m"],
  training_system: ["training_system"],
  bloom_start_current_date: ["bloom_start_current_date"],
  bloom_start_previous_date: ["bloom_start_previous_date"],
  bloom_start_normal_date: ["bloom_start_normal_date"],
  flowering_amount_vs_previous: ["flowering_amount_vs_previous"],
  flowering_amount_vs_normal: ["flowering_amount_vs_normal"],
  full_bloom_current_date: ["full_bloom_current_date"],
  full_bloom_previous_date: ["full_bloom_previous_date"],
  full_bloom_normal_date: ["full_bloom_normal_date"],
  full_bloom_amount_vs_previous: ["full_bloom_amount_vs_previous"],
  full_bloom_amount_vs_normal: ["full_bloom_amount_vs_normal"],
  fruit_thinning_completion_dates: ["fruit_thinning_completion_dates"],
  expected_harvest_dates: ["expected_harvest_dates"],
  farm_basic_notes: ["farm_basic_notes"],
};

export function getRawSampleValue(
  sample: SampleMasterRecord | undefined,
  fieldId: string
) {
  if (!sample) return "";

  const normalizedValues: Record<string, string> = {
    farm_id: sample.sampleId,
    farmer_name: sample.farmerName,
    farmer_contact: sample.phone || sample.mobilePhone,
    home_address: sample.homeAddress,
    plot_address: sample.plotAddress,
    crop: sample.crop,
    variety: sample.variety,
    detailed_variety: sample.raw.detail_variety || sample.raw.detailed_variety || "",
    surveyor_name: sample.surveyorName || sample.surveyorId,
    survey_month: sample.surveyMonth,
  };

  const normalizedValue = normalizedValues[fieldId];
  if (normalizedValue) return normalizedValue;

  const aliases = sampleFieldIdAliases[fieldId] ?? [fieldId];
  for (const alias of aliases) {
    const value = sample.raw[alias];
    if (value !== undefined) return value;
  }

  return "";
}
