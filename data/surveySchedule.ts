import type { SampleMasterRecord } from "@/data/sampleMaster";
import type { TabId } from "@/types/survey";

export type SurveyRoundKey =
  | "farm_basic"
  | "growth_1_06"
  | "growth_2_07"
  | "growth_3_08"
  | "growth_3_1"
  | "growth_4_09"
  | "growth_5_10"
  | "production_final_09_10"
  | "production_final_11";

export type SurveyRound = {
  roundKey: SurveyRoundKey;
  tabId: TabId;
  label: string;
  menuLabel: string;
  surveyMonth: string;
  windowStart?: string;
  windowEnd?: string;
  appliesToVarieties: string[];
  growthOnly?: boolean;
};

export const surveyRounds: SurveyRound[] = [
  {
    roundKey: "farm_basic",
    tabId: "farm-basic",
    label: "농가기본정보",
    menuLabel: "농가기본정보",
    surveyMonth: "202606",
    appliesToVarieties: ["홍로", "후지", "신고"],
  },
  {
    roundKey: "growth_1_06",
    tabId: "growth-june",
    label: "생육 1차(6월 10~20일)",
    menuLabel: "생육 1차(6월)",
    surveyMonth: "202606",
    windowStart: "2026-06-10",
    windowEnd: "2026-06-20",
    appliesToVarieties: ["홍로", "후지", "신고"],
    growthOnly: true,
  },
  {
    roundKey: "growth_2_07",
    tabId: "growth-july",
    label: "생육 2차(7월 10~20일)",
    menuLabel: "생육 2차(7월)",
    surveyMonth: "202607",
    windowStart: "2026-07-10",
    windowEnd: "2026-07-20",
    appliesToVarieties: ["홍로", "후지", "신고"],
    growthOnly: true,
  },
  {
    roundKey: "growth_3_08",
    tabId: "growth-august",
    label: "생육 3차(8월 10~20일)",
    menuLabel: "생육 3차(8월)",
    surveyMonth: "202608",
    windowStart: "2026-08-10",
    windowEnd: "2026-08-20",
    appliesToVarieties: ["홍로", "후지", "신고"],
    growthOnly: true,
  },
  {
    roundKey: "growth_3_1",
    tabId: "growth-september",
    label: "생육 3-1차(8/25~9/5)",
    menuLabel: "생육 3-1차(8/25~9/5)",
    surveyMonth: "202609",
    windowStart: "2026-08-25",
    windowEnd: "2026-09-05",
    appliesToVarieties: ["홍로", "신고"],
    growthOnly: true,
  },
  {
    roundKey: "growth_4_09",
    tabId: "growth-september",
    label: "생육 4차(9월 10~20일)",
    menuLabel: "생육 4차(9월)",
    surveyMonth: "202609",
    windowStart: "2026-09-10",
    windowEnd: "2026-09-20",
    appliesToVarieties: ["후지"],
    growthOnly: true,
  },
  {
    roundKey: "growth_5_10",
    tabId: "growth-september",
    label: "생육 5차(10월 10~20일)",
    menuLabel: "생육 5차(10월)",
    surveyMonth: "202610",
    windowStart: "2026-10-10",
    windowEnd: "2026-10-20",
    appliesToVarieties: ["후지"],
    growthOnly: true,
  },
  {
    roundKey: "production_final_09_10",
    tabId: "production",
    label: "생산량조사(9월~10월)",
    menuLabel: "생산량조사(9월~10월)",
    surveyMonth: "202609_202610",
    windowStart: "2026-09-01",
    windowEnd: "2026-10-31",
    appliesToVarieties: ["홍로", "신고"],
  },
  {
    roundKey: "production_final_11",
    tabId: "production",
    label: "생산량조사(11월)",
    menuLabel: "생산량조사(11월)",
    surveyMonth: "202611",
    windowStart: "2026-11-01",
    windowEnd: "2026-11-30",
    appliesToVarieties: ["후지"],
  },
];

export function getSurveyRoundsForSample(sample?: SampleMasterRecord) {
  const variety = normalizeVariety(sample?.variety || sample?.raw.variety_group);
  const growthTarget = String(sample?.growthTarget ?? sample?.raw.growth_target ?? "")
    .trim()
    .toUpperCase();
  const isGrowthTarget = growthTarget === "Y";

  return surveyRounds.filter((round) => {
    if (!round.appliesToVarieties.includes(variety)) return false;
    if (round.growthOnly && !isGrowthTarget) return false;
    return true;
  });
}

export function getSurveyRoundByKey(roundKey: string | undefined) {
  return surveyRounds.find((round) => round.roundKey === roundKey);
}

export function getDefaultSurveyRound(sample?: SampleMasterRecord) {
  return getSurveyRoundsForSample(sample)[0] ?? surveyRounds[0];
}

export function getProductionRoundKeyForVariety(variety: string) {
  const normalized = normalizeVariety(variety);
  return normalized === "후지" ? "production_final_11" : "production_final_09_10";
}

function normalizeVariety(value: string | undefined) {
  const text = String(value ?? "").trim();
  if (text.includes("홍로")) return "홍로";
  if (text.includes("후지")) return "후지";
  if (text.includes("신고")) return "신고";
  return text || "후지";
}
