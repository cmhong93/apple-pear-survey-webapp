import type { PhotoSpec, TabId } from "@/types/survey";

export type PhotoSurveyType =
  | "farm_basic"
  | "growth_1_06"
  | "growth_2_07"
  | "growth_3_08"
  | "growth_3_1"
  | "growth_4_09"
  | "growth_5_10"
  | "production_final_09_10"
  | "production_final_11";

export type PhotoRequirement = PhotoSpec & {
  surveyType: PhotoSurveyType;
  surveyLabel: string;
  photoKey: string;
  photoType: string;
  filenameLabel: string;
  minCount: number;
  blocksSubmission: boolean;
  aiEnabled: boolean;
  treeNo?: number;
  fruitNo?: number;
  measurementType?: string;
};

type RepeatPhotoConfig = {
  surveyType: PhotoSurveyType;
  surveyLabel: string;
  requiredTreeCount: number;
};

type GrowthPhotoConfig = RepeatPhotoConfig & {
  requiredFruitCount: number;
  measurementLabels: Array<{
    photoType: string;
    displayLabel: string;
    filenameLabel: string;
    aiEnabled: boolean;
  }>;
};

type ProductionPhotoConfig = RepeatPhotoConfig & {
  weightFruitNumbers: number[];
  perTreeLabels: Array<{
    photoType: string;
    displayLabel: string;
    filenameLabel: string;
    aiEnabled: boolean;
  }>;
  surveyLevelLabels: Array<{
    photoType: string;
    displayLabel: string;
    filenameLabel: string;
    aiEnabled: boolean;
    required: boolean;
  }>;
};

export const surveyTypeByTab: Record<TabId, PhotoSurveyType> = {
  "farm-basic": "farm_basic",
  interview: "farm_basic",
  "growth-june": "growth_1_06",
  "growth-july": "growth_2_07",
  "growth-august": "growth_3_08",
  "growth-september": "growth_4_09",
  production: "production_final_09_10",
};

export const surveyLabelByType: Record<PhotoSurveyType, string> = {
  farm_basic: "농가기본",
  growth_1_06: "생육6월",
  growth_2_07: "생육7월",
  growth_3_08: "생육8월",
  growth_3_1: "생육3-1차",
  growth_4_09: "생육9월",
  growth_5_10: "생육10월",
  production_final_09_10: "생산량",
  production_final_11: "생산량",
};

const farmBasicRequirements: PhotoRequirement[] = [
  {
    id: "photo_overview_1",
    surveyType: "farm_basic",
    surveyLabel: "농가기본",
    photoKey: "photo_overview_1",
    photoType: "overview",
    label: "전경 사진 1",
    shortLabel: "전경",
    filenameLabel: "전경",
    required: true,
    minCount: 1,
    blocksSubmission: true,
    aiEnabled: true,
    note: "과원 전체 위치와 주변 환경이 보이도록 서로 다른 방향에서 2컷 촬영해 주세요.",
  },
  {
    id: "photo_overview_2",
    surveyType: "farm_basic",
    surveyLabel: "농가기본",
    photoKey: "photo_overview_2",
    photoType: "overview",
    label: "전경 사진 2",
    shortLabel: "전경",
    filenameLabel: "전경",
    required: true,
    minCount: 1,
    blocksSubmission: true,
    aiEnabled: true,
    note: "과원 전체 위치와 주변 환경이 보이도록 서로 다른 방향에서 2컷 촬영해 주세요.",
  },
  {
    id: "photo_mygps660",
    surveyType: "farm_basic",
    surveyLabel: "농가기본",
    photoKey: "photo_mygps660",
    photoType: "mygps660",
    label: "MYGPS-660 사진",
    shortLabel: "MYGPS660",
    filenameLabel: "MYGPS660",
    required: true,
    minCount: 1,
    blocksSubmission: true,
    aiEnabled: true,
    needsReview: true,
    note: "MYGPS-660 화면의 위도, 경도, 고도 값이 선명하게 보이도록 촬영해 주세요.",
  },
  {
    id: "photo_bank_request_signed",
    surveyType: "farm_basic",
    surveyLabel: "농가기본",
    photoKey: "photo_bank_request_signed",
    photoType: "bank_request_signed",
    label: "계좌입금의뢰서 사인본",
    shortLabel: "계좌입금의뢰서",
    filenameLabel: "계좌입금의뢰서",
    required: true,
    minCount: 1,
    blocksSubmission: true,
    aiEnabled: false,
    aiExcluded: true,
    adminReviewRequired: true,
    needsReview: true,
    note:
      "계좌입금의뢰서 전체가 한 장에 모두 보이도록 촬영해 주세요. 서명란만 확대 촬영하지 말고 문서 상단 제목부터 하단 서명란까지 전체가 보이도록 촬영해 주세요.",
  },
];

const growthPhotoConfigs: GrowthPhotoConfig[] = [
  createGrowthConfig("growth_1_06", "생육6월"),
  createGrowthConfig("growth_2_07", "생육7월"),
  createGrowthConfig("growth_3_08", "생육8월"),
  createGrowthConfig("growth_3_1", "생육3-1차"),
  createGrowthConfig("growth_4_09", "생육9월"),
  createGrowthConfig("growth_5_10", "생육10월"),
];

const productionPhotoConfig: ProductionPhotoConfig = {
  surveyType: "production_final_09_10",
  surveyLabel: "생산량",
  requiredTreeCount: 3,
  weightFruitNumbers: [1, 15, 30],
  perTreeLabels: [
    {
      photoType: "production_harvest_sample",
      displayLabel: "수확샘플",
      filenameLabel: "수확샘플",
      aiEnabled: true,
    },
    {
      photoType: "production_tree_overview",
      displayLabel: "과수 전체",
      filenameLabel: "전체",
      aiEnabled: true,
    },
    {
      photoType: "production_fruit_count",
      displayLabel: "착과수",
      filenameLabel: "착과수",
      aiEnabled: true,
    },
  ],
  surveyLevelLabels: [
    {
      photoType: "production_field_overview",
      displayLabel: "전경",
      filenameLabel: "전경",
      aiEnabled: true,
      required: true,
    },
    {
      photoType: "production_measurement_context",
      displayLabel: "실측상황",
      filenameLabel: "실측상황",
      aiEnabled: true,
      required: true,
    },
    {
      photoType: "production_staff_context",
      displayLabel: "복장/조사상황",
      filenameLabel: "복장조사상황",
      aiEnabled: true,
      required: false,
    },
  ],
};

export const photoRequirementsBySurveyType: Record<
  PhotoSurveyType,
  PhotoRequirement[]
> = {
  farm_basic: farmBasicRequirements,
  growth_1_06: growthPhotoConfigs.flatMap((config) =>
    config.surveyType === "growth_1_06" ? createGrowthRequirements(config) : []
  ),
  growth_2_07: growthPhotoConfigs.flatMap((config) =>
    config.surveyType === "growth_2_07" ? createGrowthRequirements(config) : []
  ),
  growth_3_08: growthPhotoConfigs.flatMap((config) =>
    config.surveyType === "growth_3_08" ? createGrowthRequirements(config) : []
  ),
  growth_3_1: growthPhotoConfigs.flatMap((config) =>
    config.surveyType === "growth_3_1" ? createGrowthRequirements(config) : []
  ),
  growth_4_09: growthPhotoConfigs.flatMap((config) =>
    config.surveyType === "growth_4_09" ? createGrowthRequirements(config) : []
  ),
  growth_5_10: growthPhotoConfigs.flatMap((config) =>
    config.surveyType === "growth_5_10" ? createGrowthRequirements(config) : []
  ),
  production_final_09_10: createProductionRequirements(productionPhotoConfig),
  production_final_11: createProductionRequirements({
    ...productionPhotoConfig,
    surveyType: "production_final_11",
  }),
};

export const allPhotoRequirements = Object.values(
  photoRequirementsBySurveyType
).flat();

export function getPhotoRequirementsForSurveyType(surveyType: PhotoSurveyType) {
  return photoRequirementsBySurveyType[surveyType] ?? [];
}

export function getPhotoRequirementsForTab(tabId: TabId) {
  return getPhotoRequirementsForSurveyType(surveyTypeByTab[tabId]);
}

export function getPhotoRequirementsForRoundKey(roundKey: string) {
  return getPhotoRequirementsForSurveyType(roundKey as PhotoSurveyType);
}

export function getPhotoSurveyType(tabId: TabId) {
  return surveyTypeByTab[tabId];
}

export function getPhotoSurveyLabel(surveyType: PhotoSurveyType) {
  return surveyLabelByType[surveyType];
}

export function createPhotoFilename({
  surveyMonth,
  sampleId,
  requirement,
}: {
  surveyMonth: string;
  sampleId: string;
  requirement: PhotoRequirement;
}) {
  return sanitizeFilename(
    `${surveyMonth}_${sampleId}_${requirement.surveyLabel}_${requirement.filenameLabel}_01.jpg`
  );
}

export function createPhotoDrivePath({
  surveyMonth,
  sampleId,
  requirement,
  filename,
}: {
  surveyMonth: string;
  sampleId: string;
  requirement: PhotoRequirement;
  filename: string;
}) {
  return `${surveyMonth}/${sampleId}/${requirement.surveyLabel}/${filename}`;
}

export function getPhotoMissingMessage(requirement: PhotoRequirement) {
  if (
    requirement.photoKey === "photo_overview_1" ||
    requirement.photoKey === "photo_overview_2"
  ) {
    return "전경 사진 2컷은 필수입니다. 서로 다른 방향에서 과원 전경을 촬영해 주세요.";
  }
  if (requirement.photoKey === "photo_mygps660") {
    return "MYGPS-660 사진은 필수입니다. 위도·경도·고도 화면이 보이도록 촬영해 주세요.";
  }
  if (requirement.photoKey === "photo_bank_request_signed") {
    return "계좌입금의뢰서 사인본은 발주처 제출 필수 항목입니다. 전체 문서가 보이도록 촬영해 업로드해 주세요.";
  }
  return `${requirement.label} 사진을 업로드해 주세요.`;
}

function createGrowthConfig(
  surveyType: PhotoSurveyType,
  surveyLabel: string
): GrowthPhotoConfig {
  return {
    surveyType,
    surveyLabel,
    requiredTreeCount: 3,
    requiredFruitCount: 10,
    measurementLabels: [
      {
        photoType: "growth_fruit_long_diameter",
        displayLabel: "종경",
        filenameLabel: "종경",
        aiEnabled: true,
      },
      {
        photoType: "growth_fruit_short_diameter",
        displayLabel: "횡경",
        filenameLabel: "횡경",
        aiEnabled: true,
      },
      {
        photoType: "growth_fruit_object",
        displayLabel: "개체",
        filenameLabel: "개체",
        aiEnabled: true,
      },
    ],
  };
}

function createGrowthRequirements(config: GrowthPhotoConfig): PhotoRequirement[] {
  const requirements: PhotoRequirement[] = [];

  for (let treeNo = 1; treeNo <= config.requiredTreeCount; treeNo += 1) {
    for (let fruitNo = 1; fruitNo <= config.requiredFruitCount; fruitNo += 1) {
      config.measurementLabels.forEach((item) => {
        const filenameLabel = `${treeNo}번과수-${fruitNo}번-${item.filenameLabel}`;
        requirements.push({
          id: `${config.surveyType}_tree_${treeNo}_fruit_${fruitNo}_${item.photoType}`,
          surveyType: config.surveyType,
          surveyLabel: config.surveyLabel,
          photoKey: item.photoType,
          photoType: item.photoType,
          label: filenameLabel,
          shortLabel: item.displayLabel,
          filenameLabel,
          required: true,
          minCount: 1,
          blocksSubmission: true,
          aiEnabled: item.aiEnabled,
          treeNo,
          fruitNo,
          measurementType: item.displayLabel,
          note: "측정 대상과 사진 유형이 식별되도록 촬영해 주세요.",
        });
      });
    }

    requirements.push({
      id: `${config.surveyType}_tree_${treeNo}_overview`,
      surveyType: config.surveyType,
      surveyLabel: config.surveyLabel,
      photoKey: "growth_tree_overview",
      photoType: "growth_tree_overview",
      label: `${treeNo}번과수-전체`,
      shortLabel: "과수 전체",
      filenameLabel: `${treeNo}번과수-전체`,
      required: true,
      minCount: 1,
      blocksSubmission: true,
      aiEnabled: true,
      treeNo,
      measurementType: "과수 전체",
      note: "해당 과수 전체가 보이도록 촬영해 주세요.",
    });
  }

  return requirements;
}

function createProductionRequirements(
  config: ProductionPhotoConfig
): PhotoRequirement[] {
  const requirements: PhotoRequirement[] = [];

  for (let treeNo = 1; treeNo <= config.requiredTreeCount; treeNo += 1) {
    config.weightFruitNumbers.forEach((fruitNo) => {
      const filenameLabel = `${treeNo}번과수-${fruitNo}번-과중`;
      requirements.push({
        id: `${config.surveyType}_tree_${treeNo}_weight_${fruitNo}`,
        surveyType: config.surveyType,
        surveyLabel: config.surveyLabel,
        photoKey: `production_weight_${fruitNo}`,
        photoType: "production_weight",
        label: filenameLabel,
        shortLabel: `${fruitNo}번 과중`,
        filenameLabel,
        required: true,
        minCount: 1,
        blocksSubmission: true,
        aiEnabled: true,
        treeNo,
        fruitNo,
        measurementType: "과중",
        note: "과실과 저울 숫자가 확인되도록 촬영해 주세요.",
      });
    });

    config.perTreeLabels.forEach((item) => {
      const filenameLabel =
        item.photoType === "production_tree_overview"
          ? `${treeNo}번과수-전체`
          : `${treeNo}번과수-${item.filenameLabel}`;

      requirements.push({
        id: `${config.surveyType}_tree_${treeNo}_${item.photoType}`,
        surveyType: config.surveyType,
        surveyLabel: config.surveyLabel,
        photoKey: item.photoType,
        photoType: item.photoType,
        label: filenameLabel,
        shortLabel: item.displayLabel,
        filenameLabel,
        required: true,
        minCount: 1,
        blocksSubmission: true,
        aiEnabled: item.aiEnabled,
        treeNo,
        measurementType: item.displayLabel,
        note: "생산량조사 사진 기준에 맞춰 촬영해 주세요.",
      });
    });
  }

  config.surveyLevelLabels.forEach((item) => {
    requirements.push({
      id: `${config.surveyType}_${item.photoType}`,
      surveyType: config.surveyType,
      surveyLabel: config.surveyLabel,
      photoKey: item.photoType,
      photoType: item.photoType,
      label: item.displayLabel,
      shortLabel: item.displayLabel,
      filenameLabel: item.filenameLabel,
      required: item.required,
      minCount: item.required ? 1 : 0,
      blocksSubmission: item.required,
      aiEnabled: item.aiEnabled,
      measurementType: item.displayLabel,
      note: "생산량조사 사진 기준에 맞춰 촬영해 주세요.",
    });
  });

  return requirements;
}

function sanitizeFilename(value: string) {
  return value.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
}
