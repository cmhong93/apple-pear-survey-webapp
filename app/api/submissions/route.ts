import { randomBytes } from "node:crypto";
import { createUnauthorizedResponse, getSessionUser } from "@/lib/auth";
import {
  appendRowsToSheet,
  getGoogleSheetsConfig,
  readSheetValues,
} from "@/lib/googleSheets";
import {
  canAccessSample,
  readFarmBasicSampleWorkbook,
} from "@/lib/farmBasicSampleWorkbook";
import { surveySchema } from "@/data/surveySchema";
import {
  createPhotoFilename as createRequirementPhotoFilename,
  getPhotoMissingMessage,
  getPhotoRequirementsForRoundKey,
  getPhotoRequirementsForTab,
} from "@/data/photoRequirements";
import type { RepeatRow, SurveySubmissionPayload } from "@/types/survey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const submissionHeaders = [
  "submission_id",
  "submitted_at",
  "survey_type",
  "survey_round_key",
  "survey_label",
  "sample_id",
  "survey_month",
  "window_start",
  "window_end",
  "surveyor_id",
  "farmer_name",
  "phone",
  "crop_type",
  "variety_group",
  "detail_variety",
  "sido",
  "sigungu",
  "home_address",
  "field_address",
  "status",
  "validation_status",
  "photo_count",
  "gps_count",
  "payload_json",
];

const answerHeaders = [
  "submission_id",
  "sample_id",
  "survey_type",
  "section_id",
  "field_id",
  "field_label",
  "value",
  "unit",
  "source",
  "updated_at",
];

const photoManifestHeaders = [
  "photo_id",
  "sample_id",
  "survey_month",
  "survey_type",
  "survey_label",
  "photo_key",
  "photo_type",
  "photo_label",
  "tree_no",
  "fruit_no",
  "measurement_type",
  "required_yn",
  "drive_file_id",
  "drive_url",
  "drive_folder_id",
  "filename",
  "mime_type",
  "size_bytes",
  "uploaded_at",
  "captured_at",
  "browser_latitude",
  "browser_longitude",
  "browser_altitude",
  "gps_accuracy_m",
  "status",
  "ai_status",
  "admin_review_required",
  "caption",
  "note",
];

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return createUnauthorizedResponse();

    const payload = (await request.json().catch(() => undefined)) as
      | SurveySubmissionPayload
      | undefined;
    if (!payload) {
      return Response.json({ error: "payload is required." }, { status: 400 });
    }

    const surveyType = payload.common.survey_round_key || payload.activeTab;
    const missing = getMissingRequiredFields(payload);
    if (!surveyType) missing.push("survey_type");
    if (missing.length > 0) {
      return Response.json(
        { error: `required fields missing: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const photoErrors = getPhotoSubmitErrors(payload);
    if (photoErrors.length > 0) {
      return Response.json({ error: photoErrors[0] }, { status: 400 });
    }

    const workbook = await readFarmBasicSampleWorkbook();
    const sample = workbook.samples.find(
      (item) => item.sampleId === payload.common.sample_id
    );
    if (!sample) {
      return Response.json({ error: "sample not found." }, { status: 404 });
    }
    if (!canAccessSample(sample, user)) {
      return Response.json({ error: "sample access denied." }, { status: 403 });
    }

    const config = getGoogleSheetsConfig();
    if (
      !config.spreadsheetId ||
      !config.serviceAccountEmail ||
      !config.privateKey
    ) {
      return Response.json(
        { error: "Google Sheets environment variables are not configured." },
        { status: 500 }
      );
    }

    const submittedAt = new Date().toISOString();
    const clientSubmissionId =
      payload.client_submission_id || createSubmissionId("client");

    await appendRowsToSheet({
      spreadsheetId: config.spreadsheetId,
      sheetName: "survey_submissions",
      headers: submissionHeaders,
      rows: [],
    });

    const existingRows = await readSheetValues({
      spreadsheetId: config.spreadsheetId,
      range: "'survey_submissions'!A:Z",
    });
    const existingHeaders = existingRows[0] ?? [];
    const payloadJsonIndex = existingHeaders.indexOf("payload_json");
    const duplicate = existingRows.slice(1).find((row) => {
      const payloadJson =
        payloadJsonIndex >= 0 ? row[payloadJsonIndex] : row[19];
      if (!payloadJson) return false;

      try {
        const existingPayload = JSON.parse(payloadJson) as {
          client_submission_id?: string;
        };
        return existingPayload.client_submission_id === clientSubmissionId;
      } catch {
        return false;
      }
    });

    if (duplicate) {
      return Response.json({
        duplicate: true,
        submission_id: duplicate[0],
        submitted_at: duplicate[1],
        answer_count: 0,
      });
    }

    const submissionId = createSubmissionId("sub");
    const answerRows = flattenAnswers({
      submissionId,
      sampleId: payload.common.sample_id,
      surveyType,
      payload,
      updatedAt: submittedAt,
    });
    const submissionPayload = {
      ...payload,
      client_submission_id: clientSubmissionId,
      submittedAt,
    };

    await appendRowsToSheet({
      spreadsheetId: config.spreadsheetId,
      sheetName: "survey_submissions",
      headers: submissionHeaders,
      rows: [
        [
          submissionId,
          submittedAt,
          surveyType,
          payload.common.survey_round_key,
          payload.common.survey_label,
          payload.common.sample_id,
          payload.common.survey_month,
          payload.common.window_start ?? "",
          payload.common.window_end ?? "",
          payload.common.surveyor_id,
          payload.common.farmer_name,
          payload.common.phone,
          payload.common.crop_type,
          payload.common.variety_group,
          payload.common.detail_variety,
          payload.common.sido,
          payload.common.sigungu,
          payload.common.home_address,
          payload.common.field_address,
          "submitted",
          "pending_review",
          countCompletedPhotos(payload),
          countGpsValues(payload),
          JSON.stringify(submissionPayload),
        ],
      ],
    });

    await appendRowsToSheet({
      spreadsheetId: config.spreadsheetId,
      sheetName: "survey_answers",
      headers: answerHeaders,
      rows: answerRows,
    });

    await appendRowsToSheet({
      spreadsheetId: config.spreadsheetId,
      sheetName: "photo_manifest",
      headers: photoManifestHeaders,
      rows: createStagePhotoManifestRows({
        submissionId,
        payload,
        updatedAt: submittedAt,
      }),
    });

    return Response.json({
      submission_id: submissionId,
      submitted_at: submittedAt,
      answer_count: answerRows.length,
    });
  } catch {
    return Response.json(
      { error: "submission save failed." },
      { status: 500 }
    );
  }
}

function getPhotoSubmitErrors(payload: SurveySubmissionPayload) {
  const errors: string[] = [];
  const activePhotos = getPhotosForSurveyType(
    payload.common.survey_round_key || payload.activeTab
  );
  activePhotos
    .filter((photo) => photo.required)
    .forEach((photo) => {
      const status = payload.photoStates[photo.id]?.status ?? "미촬영";
      if (status === "촬영 완료") return;

      if (photo.blocksSubmission) {
        errors.push(getPhotoMissingMessage(photo));
        return;
      }

      if (photo.id === "photo_bank_request_signed") {
        errors.push(
          "계좌입금의뢰서 서명본은 발주처 제출 필수 항목입니다. 전체 문서가 보이도록 촬영해 업로드해 주세요."
        );
        return;
      }

      errors.push(`${photo.label}은 필수 촬영 항목입니다.`);
    });

  return errors;
}

function getPhotosForSurveyType(surveyType: string) {
  return surveyType.includes("_")
    ? getPhotoRequirementsForRoundKey(surveyType)
    : getPhotoRequirementsForTab(surveyType as SurveySubmissionPayload["activeTab"]);
}

function createPhotoManifestRows({
  submissionId,
  payload,
  updatedAt,
}: {
  submissionId: string;
  payload: SurveySubmissionPayload;
  updatedAt: string;
}) {
  const surveyLabel = payload.activeTab === "farm-basic" ? "농가기본" : payload.activeTab;
  const photos = getPhotosForSurveyType(
    payload.common.survey_round_key || payload.activeTab
  );

  return photos.map((photo) => {
    const photoState = payload.photoStates[photo.id];
    const uploaded = photoState?.status === "촬영 완료";
    const shortLabel = photo.shortLabel ?? photo.label;
    const filename = uploaded
      ? `${payload.common.survey_month}_${payload.common.sample_id}_${surveyLabel}_${shortLabel}_01.jpg`
      : "";

    return [
      submissionId,
      payload.common.sample_id,
      payload.common.survey_month,
      payload.activeTab,
      surveyLabel,
      photo.id,
      photo.label,
      photo.required ? "Y" : "N",
      uploaded ? "uploaded" : "missing",
      photo.aiExcluded ? "ai_excluded" : "pending",
      photo.adminReviewRequired ? "Y" : "N",
      sanitizeFilename(filename),
      uploaded
        ? `${payload.common.survey_month}/${payload.common.sample_id}/${surveyLabel}/${sanitizeFilename(
            filename
          )}`
        : "",
      updatedAt,
    ];
  });
}

function createStagePhotoManifestRows({
  submissionId,
  payload,
  updatedAt,
}: {
  submissionId: string;
  payload: SurveySubmissionPayload;
  updatedAt: string;
}) {
  const photos = getPhotosForSurveyType(
    payload.common.survey_round_key || payload.activeTab
  );

  return photos.map((photo) => {
    const photoState = payload.photoStates[photo.id];
    const uploaded = photoState?.status === "촬영 완료";
    const filename = uploaded
      ? createRequirementPhotoFilename({
          surveyMonth: payload.common.survey_month,
          sampleId: payload.common.sample_id,
          requirement: photo,
        })
      : "";

    return [
      `${submissionId}_${photo.id}`,
      payload.common.sample_id,
      payload.common.survey_month,
      photo.surveyType,
      photo.surveyLabel,
      photo.photoKey,
      photo.photoType,
      photo.label,
      photo.treeNo ?? "",
      photo.fruitNo ?? "",
      photo.measurementType ?? "",
      photo.required ? "Y" : "N",
      "",
      "",
      "",
      sanitizeFilename(filename),
      uploaded ? "image/jpeg" : "",
      "",
      uploaded ? updatedAt : "",
      "",
      payload.gpsState.latitude,
      payload.gpsState.longitude,
      payload.gpsState.altitude,
      payload.gpsState.accuracy,
      uploaded ? "uploaded" : "missing",
      photo.aiExcluded ? "ai_excluded" : "pending",
      photo.adminReviewRequired ? "Y" : "N",
      "",
      photo.note ?? "",
    ];
  });
}

function createPhotoFilename({
  surveyMonth,
  sampleId,
  surveyLabel,
  photoId,
  shortLabel,
}: {
  surveyMonth: string;
  sampleId: string;
  surveyLabel: string;
  photoId: string;
  shortLabel: string;
}) {
  const sequenceByPhotoId: Record<string, string> = {
    photo_overview_1: "01",
    photo_overview_2: "02",
    photo_mygps660: "01",
    photo_bank_request_signed: "01",
  };

  return `${surveyMonth}_${sampleId}_${surveyLabel}_${shortLabel}_${
    sequenceByPhotoId[photoId] ?? "01"
  }.jpg`;
}

function getMissingRequiredFields(payload: SurveySubmissionPayload) {
  const missing: string[] = [];
  const common = payload.common;

  if (!common?.sample_id) missing.push("sample_id");
  if (!common?.survey_month) missing.push("survey_month");
  if (!common?.surveyor_id) missing.push("surveyor_id");

  return missing;
}

function flattenAnswers({
  submissionId,
  sampleId,
  surveyType,
  payload,
  updatedAt,
}: {
  submissionId: string;
  sampleId: string;
  surveyType: string;
  payload: SurveySubmissionPayload;
  updatedAt: string;
}) {
  const rows: unknown[][] = [];
  const fieldLookup = new Map(
    surveySchema.fields.map((field) => [`${field.tabId}:${field.id}`, field])
  );

  Object.entries(payload.formData).forEach(([sectionId, values]) => {
    Object.entries(values).forEach(([fieldId, value]) => {
      const field = fieldLookup.get(`${sectionId}:${fieldId}`);
      rows.push(
        createAnswerRow({
          submissionId,
          sampleId,
          surveyType,
          sectionId,
          fieldId: field?.fieldId ?? fieldId,
          field,
          value,
          updatedAt,
        })
      );
    });
  });

  Object.entries(payload.repeatData).forEach(([groupId, repeatRows]) => {
    const group = surveySchema.repeatGroups.find((item) => item.id === groupId);

    repeatRows.forEach((row: RepeatRow) => {
      Object.entries(row.values).forEach(([fieldId, value]) => {
        const field = group?.fields.find((item) => item.id === fieldId);
        rows.push(
          createAnswerRow({
            submissionId,
            sampleId,
            surveyType,
            sectionId: `${groupId}:${row.parentId}:${row.index}`,
            fieldId: `${groupId}.${fieldId}`,
            field,
            value,
            updatedAt,
          })
        );
      });
    });
  });

  return rows;
}

function createAnswerRow({
  submissionId,
  sampleId,
  surveyType,
  sectionId,
  fieldId,
  field,
  value,
  updatedAt,
}: {
  submissionId: string;
  sampleId: string;
  surveyType: string;
  sectionId: string;
  fieldId: string;
  field?: { label?: string; unit?: string; sourceFile?: string };
  value: unknown;
  updatedAt: string;
}) {
  return [
    submissionId,
    sampleId,
    surveyType,
    sectionId,
    fieldId,
    field?.label ?? fieldId,
    stringifyValue(value),
    field?.unit ?? "",
    field?.sourceFile ?? "",
    updatedAt,
  ];
}

function stringifyValue(value: unknown) {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return "";
  return JSON.stringify(value);
}

function countCompletedPhotos(payload: SurveySubmissionPayload) {
  return getPhotosForSurveyType(payload.common.survey_round_key || payload.activeTab).filter(
    (photo) => payload.photoStates[photo.id]?.status === "촬영 완료"
  ).length;
}

function countGpsValues(payload: SurveySubmissionPayload) {
  return [
    payload.gpsState.latitude,
    payload.gpsState.longitude,
    payload.gpsState.altitude,
    payload.gpsState.accuracy,
    payload.gpsState.timestamp,
  ].filter(Boolean).length;
}

function sanitizeFilename(value: string) {
  return value.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
}

function createSubmissionId(prefix: string) {
  return `${prefix}_${Date.now()}_${randomBytes(4).toString("hex")}`;
}
