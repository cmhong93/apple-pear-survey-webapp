import { createUnauthorizedResponse, getSessionUser } from "@/lib/auth";
import { readFarmBasicSampleWorkbook } from "@/lib/farmBasicSampleWorkbook";
import { getGoogleSheetsConfig, readSheetValues } from "@/lib/googleSheets";
import { toCoordinate } from "@/utils/gpsConsistency";
import {
  photoRequirementsBySurveyType,
  surveyLabelByType,
  type PhotoSurveyType,
} from "@/data/photoRequirements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubmissionSummary = {
  sampleId: string;
  status: string;
  validationStatus: string;
  photoCount: number;
  gpsCount: number;
};

type ManifestRow = Record<string, string>;

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return createUnauthorizedResponse();
    if (user.role !== "admin") {
      return Response.json({ error: "admin access required." }, { status: 403 });
    }

    const workbook = await readFarmBasicSampleWorkbook();
    const [submissions, photoManifest, exportManifest, gpsLog] = await Promise.all([
      readSubmissionSummaries(),
      readManifest("photo_manifest"),
      readManifest("export_manifest"),
      readManifest("gps_log"),
    ]);
    const submissionBySample = new Map(
      submissions.map((submission) => [submission.sampleId, submission])
    );

    const samples = workbook.samples.map((sample) => {
      const submission = submissionBySample.get(sample.sampleId);
      const photos = photoManifest.filter((row) => row.sample_id === sample.sampleId);
      const exports = exportManifest.filter((row) => row.sample_id === sample.sampleId);
      const gps = gpsLog.find((row) => row.sample_id === sample.sampleId);

      return {
        sampleId: sample.sampleId,
        farmerName: sample.farmerName,
        phone: sample.phone || sample.mobilePhone,
        homeAddress: sample.homeAddress,
        fieldAddress: sample.plotAddress,
        region: sample.administrativeRegion,
        crop: sample.crop,
        variety: sample.variety,
        growthTarget: sample.growthTarget,
        surveyCase: sample.surveyCase,
        assignedTeam: sample.assignedTeam || inferTeam(sample.surveyorId),
        surveyorId: sample.surveyorId || sample.surveyorName,
        altitude: sample.raw.altitude_m || sample.raw.altitude || "",
        submissionStatus: submission ? "제출완료" : "미제출",
        photoStatus: getPhotoStatus(photos, submission),
        photoSummaryBySurvey: getPhotoSummaryBySurvey(photos),
        bankRequestStatus: getBankRequestStatus(photos),
        pdfStatus: exports.length > 0 ? "생성완료" : "미생성",
        reviewStatus:
          submission?.validationStatus === "reviewed"
            ? "완료"
            : submission
            ? "관리자 확인 필요"
            : "대기",
        gpsStatus: getGpsStatus(gps, submission),
        plotCoordinate: toCoordinate(sample.raw.latitude, sample.raw.longitude),
        browserCoordinate: toCoordinate(gps?.browser_latitude, gps?.browser_longitude),
        myGpsCoordinate: toCoordinate(gps?.mygps_latitude, gps?.mygps_longitude),
      };
    });

    return Response.json({ samples });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "관리자 표본 데이터를 불러오지 못했습니다.",
      },
      { status: 500 }
    );
  }
}

async function readSubmissionSummaries(): Promise<SubmissionSummary[]> {
  const config = getGoogleSheetsConfig();
  if (!config.spreadsheetId) return [];

  const values = await readSheetValues({
    spreadsheetId: config.spreadsheetId,
    range: "'survey_submissions'!A:T",
  }).catch(() => []);
  const headers = values[0] ?? [];

  return values
    .slice(1)
    .map((row) => {
      const raw = Object.fromEntries(
        headers.map((header, index) => [header, row[index] ?? ""])
      );
      return {
        sampleId: raw.sample_id ?? "",
        status: raw.status ?? "",
        validationStatus: raw.validation_status ?? "",
        photoCount: Number(raw.photo_count ?? 0) || 0,
        gpsCount: Number(raw.gps_count ?? 0) || 0,
      };
    })
    .filter((row) => row.sampleId);
}

async function readManifest(sheetName: string): Promise<ManifestRow[]> {
  const config = getGoogleSheetsConfig();
  if (!config.spreadsheetId) return [];

  const values = await readSheetValues({
    spreadsheetId: config.spreadsheetId,
    range: `'${sheetName}'!A:AC`,
  }).catch(() => []);
  const headers = values[0] ?? [];

  return values.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]))
  );
}

function getPhotoStatus(photos: ManifestRow[], submission: SubmissionSummary | undefined) {
  if (photos.length >= 4 || (submission?.photoCount ?? 0) >= 4) return "정상";
  if (photos.length > 0 || submission) return "관리자 확인 필요";
  return "대기";
}

function getPhotoSummaryBySurvey(photos: ManifestRow[]) {
  const uploaded = photos.filter((row) => row.status === "uploaded");

  return (Object.keys(photoRequirementsBySurveyType) as PhotoSurveyType[]).map(
    (surveyType) => {
      const requirements = photoRequirementsBySurveyType[surveyType];
      const uploadedCount = requirements.filter((requirement) =>
        uploaded.some(
          (row) =>
            row.survey_type === surveyType &&
            (row.photo_id === requirement.id ||
              row.photo_key === requirement.photoKey ||
              row.photo_type === requirement.photoType)
        )
      ).length;
      const adminReviewCount = uploaded.filter(
        (row) =>
          row.survey_type === surveyType && row.admin_review_required === "Y"
      ).length;
      const aiPendingCount = uploaded.filter(
        (row) => row.survey_type === surveyType && row.ai_status === "pending"
      ).length;
      const blockingMissing = requirements.filter(
        (requirement) =>
          requirement.blocksSubmission &&
          !uploaded.some(
            (row) =>
              row.survey_type === surveyType &&
              (row.photo_id === requirement.id ||
                row.photo_key === requirement.photoKey ||
                row.photo_type === requirement.photoType)
          )
      ).length;

      return {
        surveyType,
        surveyLabel: surveyLabelByType[surveyType],
        requiredCount: requirements.length,
        uploadedCount,
        missingCount: Math.max(requirements.length - uploadedCount, 0),
        aiPendingCount,
        adminReviewCount,
        blockingMissing,
      };
    }
  );
}

function getBankRequestStatus(photos: ManifestRow[]) {
  const bankPhoto = photos.find((row) =>
    [row.photo_type, row.photo_id, row.type].some((value) =>
      String(value ?? "").includes("bank")
    )
  );
  return bankPhoto ? "업로드 완료" : "관리자 확인 필요";
}

function getGpsStatus(gps: ManifestRow | undefined, submission: SubmissionSummary | undefined) {
  if (gps || (submission?.gpsCount ?? 0) > 0) return "정상";
  return "확인 필요";
}

function inferTeam(surveyorId: string) {
  if (["S01", "S02"].includes(surveyorId)) return "T01";
  if (["S03", "S04"].includes(surveyorId)) return "T02";
  if (["S05", "S06"].includes(surveyorId)) return "T03";
  if (["S07", "S08"].includes(surveyorId)) return "T04";
  return "";
}
