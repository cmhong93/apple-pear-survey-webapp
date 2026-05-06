import { randomUUID } from "node:crypto";
import { createUnauthorizedResponse, getSessionUser } from "@/lib/auth";
import {
  canAccessSample,
  readFarmBasicSampleWorkbook,
} from "@/lib/farmBasicSampleWorkbook";
import {
  appendRowsToSheet,
  getGoogleSheetsConfig,
  readSheetValues,
} from "@/lib/googleSheets";
import {
  ensureDriveFolderPath,
  getGoogleDriveConfig,
  uploadPdfToDrive,
} from "@/lib/googleDrive";
import { createFarmBasicPdf } from "@/lib/farmBasicPdfExport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const exportManifestHeaders = [
  "export_id",
  "sample_id",
  "survey_month",
  "survey_type",
  "survey_label",
  "file_type",
  "drive_file_id",
  "drive_url",
  "drive_folder_id",
  "filename",
  "generated_at",
  "generated_by",
  "submission_id",
  "version",
  "status",
  "note",
];

type ExportRequestBody = {
  sample_id?: string;
  submission_id?: string;
};

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return createUnauthorizedResponse();

    const body = (await request.json().catch(() => undefined)) as
      | ExportRequestBody
      | undefined;
    const sampleId = body?.sample_id?.trim() ?? "";
    const submissionId = body?.submission_id?.trim() ?? "";

    if (!sampleId || !submissionId) {
      return Response.json(
        { error: "sample_id and submission_id are required." },
        { status: 400 }
      );
    }

    const workbook = await readFarmBasicSampleWorkbook();
    const sample = workbook.samples.find((item) => item.sampleId === sampleId);
    if (!sample) return Response.json({ error: "sample not found." }, { status: 404 });
    if (!canAccessSample(sample, user)) {
      return Response.json({ error: "sample access denied." }, { status: 403 });
    }

    const sheetsConfig = getGoogleSheetsConfig();
    const driveConfig = getGoogleDriveConfig();
    if (!sheetsConfig.spreadsheetId || !driveConfig.rootFolderId) {
      return Response.json(
        { error: "Google Sheets or Drive environment variables are not configured." },
        { status: 500 }
      );
    }

    const submission = await findSubmission({
      spreadsheetId: sheetsConfig.spreadsheetId,
      submissionId,
      sampleId,
    });
    if (!submission) {
      return Response.json({ error: "submission not found." }, { status: 404 });
    }

    const answers = await readAnswers({
      spreadsheetId: sheetsConfig.spreadsheetId,
      submissionId,
    });
    const surveyMonth = submission.surveyMonth || "202606";
    const surveyLabel = "농가기본";
    const filename = sanitizeFilename(
      `${surveyMonth}_${sampleId}_${surveyLabel}_조사표.pdf`
    );
    const values = createPdfValues({ submission, answers });
    const pdfBytes = await createFarmBasicPdf(values);
    const folderId = await ensureDriveFolderPath({
      rootFolderId: driveConfig.rootFolderId,
      segments: [surveyMonth, sampleId, surveyLabel],
    });
    const driveFile = await uploadPdfToDrive({
      folderId,
      filename,
      data: pdfBytes,
    });
    const generatedAt = new Date().toISOString();
    const exportId = `export_${Date.now()}_${randomUUID().slice(0, 8)}`;

    await appendRowsToSheet({
      spreadsheetId: sheetsConfig.spreadsheetId,
      sheetName: "export_manifest",
      headers: exportManifestHeaders,
      rows: [
        [
          exportId,
          sampleId,
          surveyMonth,
          submission.surveyType,
          surveyLabel,
          "pdf",
          driveFile.id,
          driveFile.webViewLink ?? "",
          folderId,
          filename,
          generatedAt,
          user.userId,
          submissionId,
          "v1",
          "generated",
          "official farm basic template",
        ],
      ],
    });

    return Response.json({
      filename,
      drive_file_id: driveFile.id,
      drive_url: driveFile.webViewLink ?? "",
      status: "generated",
    });
  } catch {
    return Response.json({ error: "PDF export failed." }, { status: 500 });
  }
}

async function findSubmission({
  spreadsheetId,
  submissionId,
  sampleId,
}: {
  spreadsheetId: string;
  submissionId: string;
  sampleId: string;
}) {
  const rows = await readSheetValues({
    spreadsheetId,
    range: "'survey_submissions'!A:T",
  });
  const row = rows
    .slice(1)
    .find((item) => item[0] === submissionId && item[3] === sampleId);
  if (!row) return undefined;

  return {
    submissionId: row[0] ?? "",
    submittedAt: row[1] ?? "",
    surveyType: row[2] ?? "",
    sampleId: row[3] ?? "",
    surveyMonth: row[4] ?? "",
    surveyorId: row[5] ?? "",
    farmerName: row[6] ?? "",
    phone: row[7] ?? "",
    cropType: row[8] ?? "",
    varietyGroup: row[9] ?? "",
    detailVariety: row[10] ?? "",
    sido: row[11] ?? "",
    sigungu: row[12] ?? "",
    homeAddress: row[13] ?? "",
    fieldAddress: row[14] ?? "",
  };
}

async function readAnswers({
  spreadsheetId,
  submissionId,
}: {
  spreadsheetId: string;
  submissionId: string;
}) {
  const rows = await readSheetValues({
    spreadsheetId,
    range: "'survey_answers'!A:J",
  });
  const answers: Record<string, string> = {};
  rows.slice(1).forEach((row) => {
    if (row[0] !== submissionId) return;
    const fieldId = row[4] ?? "";
    const value = row[6] ?? "";
    if (fieldId) answers[fieldId] = value;
  });
  return answers;
}

function createPdfValues({
  submission,
  answers,
}: {
  submission: NonNullable<Awaited<ReturnType<typeof findSubmission>>>;
  answers: Record<string, string>;
}) {
  return {
    farm_id: submission.sampleId,
    farmer_name: submission.farmerName,
    farmer_contact: submission.phone,
    home_address: submission.homeAddress,
    plot_address: submission.fieldAddress,
    survey_datetime: answers.survey_datetime || submission.submittedAt.slice(0, 10),
    surveyor_name: submission.surveyorId,
    variety: submission.varietyGroup,
    detailed_variety: answers.detailed_variety || submission.detailVariety,
    altitude_m: answers.altitude_m,
    altitude_source: answers.altitude_source,
    standing_trade_yn: answers.standing_trade_yn,
    plot_area_pyeong: answers.plot_area_pyeong,
    row_spacing_m: answers.row_spacing_m,
    tree_spacing_m: answers.tree_spacing_m,
    planted_tree_count: answers.planted_tree_count,
    tree_count_changed_reason: answers.tree_count_changed_reason,
    training_system: answers.training_system,
    training_system_other: answers.training_system_other,
    bloom_start_current_date: answers.bloom_start_current_date,
    bloom_start_previous_date: answers.bloom_start_previous_date,
    bloom_start_normal_date: answers.bloom_start_normal_date,
    full_bloom_current_date: answers.full_bloom_current_date,
    full_bloom_previous_date: answers.full_bloom_previous_date,
    full_bloom_normal_date: answers.full_bloom_normal_date,
    flowering_amount_vs_previous: answers.flowering_amount_vs_previous,
    flowering_amount_vs_normal: answers.flowering_amount_vs_normal,
    full_bloom_amount_vs_previous: answers.full_bloom_amount_vs_previous,
    full_bloom_amount_vs_normal: answers.full_bloom_amount_vs_normal,
    fruit_set_target_count_current: answers.fruit_set_target_count_current,
    fruit_set_count_previous_year: answers.fruit_set_count_previous_year,
    fruit_set_count_normal_year: answers.fruit_set_count_normal_year,
    cold_damage_2026_rate: answers.cold_damage_2026_rate,
    cold_damage_2026_no_fruit_set_rate: answers.cold_damage_2026_no_fruit_set_rate,
    cold_damage_2026_quality_decline_rate:
      answers.cold_damage_2026_quality_decline_rate,
    cold_damage_2025_rate: answers.cold_damage_2025_rate,
    cold_damage_2025_no_fruit_set_rate: answers.cold_damage_2025_no_fruit_set_rate,
    cold_damage_2025_quality_decline_rate:
      answers.cold_damage_2025_quality_decline_rate,
    fruit_thinning_completion_dates: answers.fruit_thinning_completion_dates,
    expected_harvest_dates: answers.expected_harvest_dates,
    farm_basic_notes: answers.farm_basic_notes,
  };
}

function sanitizeFilename(value: string) {
  return value.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
}
