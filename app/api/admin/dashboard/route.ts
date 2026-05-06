import { createUnauthorizedResponse, getSessionUser } from "@/lib/auth";
import { readFarmBasicSampleWorkbook } from "@/lib/farmBasicSampleWorkbook";
import { getGoogleSheetsConfig, readSheetValues } from "@/lib/googleSheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const operationMonth = "202606";
const growthTargetCount = 21;
const requiredSheetNames = [
  "sample_master",
  "investigator_master",
  "team_master",
  "survey_submissions",
  "survey_answers",
  "gps_log",
  "photo_manifest",
  "ai_validation_results",
  "export_manifest",
  "admin_audit_logs",
];
const auditLogSchema = [
  "audit_id",
  "admin_id",
  "action_type",
  "target_type",
  "target_id",
  "sample_id",
  "accessed_at",
  "ip_hash",
  "user_agent",
  "note",
];

type SubmissionRow = {
  submissionId: string;
  submittedAt: string;
  surveyType: string;
  sampleId: string;
  validationStatus: string;
  photoCount: number;
  gpsCount: number;
};

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return createUnauthorizedResponse();
    if (user.role !== "admin") {
      return Response.json({ error: "admin access required." }, { status: 403 });
    }

    const workbook = await readFarmBasicSampleWorkbook();
    const [submissions, sheetStatus] = await Promise.all([
      readSubmissions(),
      readSheetStatus(),
    ]);
    const submittedSampleIds = new Set(
      submissions.map((submission) => submission.sampleId).filter(Boolean)
    );
    const totalSamples = workbook.samples.length || 90;
    const pendingSamples = Math.max(totalSamples - submittedSampleIds.size, 0);
    const todayKey = toDateKey(new Date());
    const todaySubmissions = submissions.filter(
      (submission) => toDateKey(new Date(submission.submittedAt)) === todayKey
    );
    const pendingReviewCount = submissions.filter(
      (submission) => submission.validationStatus !== "reviewed"
    ).length;

    return Response.json({
      generatedAt: new Date().toISOString(),
      operationMonth,
      summary: {
        totalSamples,
        submittedSamples: submittedSampleIds.size,
        pendingSamples,
        totalSubmissions: submissions.length,
        todaySubmissions: todaySubmissions.length,
        photoIncomplete: countPhotoIncomplete(submissions),
        pendingReviewCount,
        completionRate:
          totalSamples === 0
            ? 0
            : Math.round((submittedSampleIds.size / totalSamples) * 1000) / 10,
      },
      stages: createStageRows({
        totalSamples,
        submissions,
        pendingReviewCount,
      }),
      progress: {
        submitted: submittedSampleIds.size,
        review: pendingReviewCount,
        pending: pendingSamples,
        completionRate:
          totalSamples === 0
            ? 0
            : Math.round((submittedSampleIds.size / totalSamples) * 1000) / 10,
      },
      auditLogSchema,
      sheetStatus,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "관리자 대시보드 데이터를 불러오지 못했습니다.",
      },
      { status: 500 }
    );
  }
}

async function readSubmissions(): Promise<SubmissionRow[]> {
  const config = getGoogleSheetsConfig();
  if (!config.spreadsheetId) return [];

  const values = await readSheetValues({
    spreadsheetId: config.spreadsheetId,
    range: "'survey_submissions'!A:T",
  }).catch(() => []);
  const headers = values[0] ?? [];

  return values
    .slice(1)
    .map((row) => rowToSubmission(headers, row))
    .filter((row) => row.submissionId);
}

async function readSheetStatus() {
  const config = getGoogleSheetsConfig();
  if (!config.spreadsheetId) {
    return requiredSheetNames.map((sheetName) => ({
      sheetName,
      status: "미설정",
      note: "GOOGLE_SHEETS_SPREADSHEET_ID 필요",
    }));
  }

  return Promise.all(
    requiredSheetNames.map(async (sheetName) => {
      const rows = await readSheetValues({
        spreadsheetId: config.spreadsheetId,
        range: `'${sheetName}'!A1:A2`,
      }).catch(() => []);
      return {
        sheetName,
        status: rows.length > 0 ? "연동" : "대기",
        note: rows.length > 0 ? "읽기 가능" : "초기 생성 또는 데이터 적재 필요",
      };
    })
  );
}

function rowToSubmission(headers: string[], row: string[]): SubmissionRow {
  const raw = Object.fromEntries(
    headers.map((header, index) => [header, row[index] ?? ""])
  );

  return {
    submissionId: raw.submission_id ?? "",
    submittedAt: raw.submitted_at ?? "",
    surveyType: raw.survey_type ?? "",
    sampleId: raw.sample_id ?? "",
    validationStatus: raw.validation_status ?? "",
    photoCount: Number(raw.photo_count ?? 0) || 0,
    gpsCount: Number(raw.gps_count ?? 0) || 0,
  };
}

function createStageRows({
  totalSamples,
  submissions,
  pendingReviewCount,
}: {
  totalSamples: number;
  submissions: SubmissionRow[];
  pendingReviewCount: number;
}) {
  const countByType = (surveyType: string) =>
    new Set(
      submissions
        .filter((submission) => submission.surveyType === surveyType)
        .map((submission) => submission.sampleId)
        .filter(Boolean)
    ).size;
  const rows = [
    { key: "farm_basic", label: "농가기본정보", target: totalSamples },
    { key: "growth_06", label: "생육조사 6월", target: growthTargetCount },
    { key: "growth_07", label: "생육조사 7월", target: growthTargetCount },
    { key: "growth_08", label: "생육조사 8월", target: growthTargetCount },
    { key: "growth_09", label: "생육조사 9월", target: growthTargetCount },
    { key: "production", label: "생산량조사", target: totalSamples },
  ];

  return rows.map((row) => {
    const submitted =
      row.key === "farm_basic"
        ? countByType("farm-basic")
        : row.key === "growth_06"
        ? countByType("growth-june")
        : row.key === "growth_07"
        ? countByType("growth-july")
        : row.key === "growth_08"
        ? countByType("growth-august")
        : row.key === "growth_09"
        ? countByType("growth-september")
        : countByType("production");

    return {
      ...row,
      submitted,
      pending: Math.max(row.target - submitted, 0),
      review: row.key === "farm_basic" ? pendingReviewCount : 0,
      note: row.key.startsWith("growth")
        ? "생육 대상 21건 기준"
        : "표본 원장 기준",
    };
  });
}

function countPhotoIncomplete(submissions: SubmissionRow[]) {
  if (submissions.length === 0) return 0;
  return submissions.filter((submission) => submission.photoCount < 4).length;
}

function toDateKey(date: Date) {
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
