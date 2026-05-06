import { randomUUID } from "node:crypto";
import { createUnauthorizedResponse, getSessionUser } from "@/lib/auth";
import {
  canAccessSample,
  readFarmBasicSampleWorkbook,
} from "@/lib/farmBasicSampleWorkbook";
import {
  appendRowsToSheet,
  getGoogleSheetsConfig,
} from "@/lib/googleSheets";
import {
  ensureDriveFolderPath,
  getGoogleDriveConfig,
  uploadFileToDrive,
} from "@/lib/googleDrive";
import {
  createPhotoFilename,
  getPhotoRequirementsForRoundKey,
  getPhotoRequirementsForTab,
  type PhotoRequirement,
} from "@/data/photoRequirements";
import type { TabId } from "@/types/survey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const formData = await request.formData();
    const file = formData.get("file");
    const sampleId = getText(formData, "sample_id");
    const surveyMonth = getText(formData, "survey_month") || "202606";
    const activeTab = getText(formData, "active_tab") as TabId;
    const surveyRoundKey = getText(formData, "survey_round_key");
    const photoId = getText(formData, "photo_id");

    if (!isUploadFile(file)) {
      return Response.json({ error: "file is required." }, { status: 400 });
    }
    if (!sampleId || !activeTab || !photoId) {
      return Response.json(
        { error: "sample_id, active_tab and photo_id are required." },
        { status: 400 }
      );
    }

    const requirement = (
      surveyRoundKey
        ? getPhotoRequirementsForRoundKey(surveyRoundKey)
        : getPhotoRequirementsForTab(activeTab)
    ).find((item) => item.id === photoId);
    if (!requirement) {
      return Response.json({ error: "photo requirement not found." }, { status: 400 });
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

    const filename = createPhotoFilename({
      surveyMonth,
      sampleId,
      requirement,
    });
    const folderId = await ensureDriveFolderPath({
      rootFolderId: driveConfig.rootFolderId,
      segments: [surveyMonth, sampleId, requirement.surveyLabel],
    });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mimeType = file.type || "image/jpeg";
    const uploaded = await uploadFileToDrive({
      folderId,
      filename,
      data: bytes,
      mimeType,
    });
    const uploadedAt = new Date().toISOString();
    const photoIdForManifest = `photo_${Date.now()}_${randomUUID().slice(0, 8)}`;

    await appendRowsToSheet({
      spreadsheetId: sheetsConfig.spreadsheetId,
      sheetName: "photo_manifest",
      headers: photoManifestHeaders,
      rows: [
        createPhotoManifestRow({
          photoId: photoIdForManifest,
          sampleId,
          surveyMonth,
          requirement,
          driveFileId: uploaded.id,
          driveUrl: uploaded.webViewLink ?? "",
          driveFolderId: folderId,
          filename: uploaded.name || filename,
          mimeType: uploaded.mimeType || mimeType,
          sizeBytes: uploaded.size || String(file.size),
          uploadedAt,
          capturedAt: getText(formData, "captured_at"),
          latitude: getText(formData, "browser_latitude"),
          longitude: getText(formData, "browser_longitude"),
          altitude: getText(formData, "browser_altitude"),
          accuracy: getText(formData, "gps_accuracy_m"),
        }),
      ],
    });

    return Response.json({
      status: "uploaded",
      photo_id: photoIdForManifest,
      photo_type: requirement.photoType,
      photo_key: requirement.photoKey,
      filename: uploaded.name || filename,
      drive_file_id: uploaded.id,
      survey_type: requirement.surveyType,
      survey_label: requirement.surveyLabel,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "photo upload failed.",
      },
      { status: 500 }
    );
  }
}

function createPhotoManifestRow({
  photoId,
  sampleId,
  surveyMonth,
  requirement,
  driveFileId,
  driveUrl,
  driveFolderId,
  filename,
  mimeType,
  sizeBytes,
  uploadedAt,
  capturedAt,
  latitude,
  longitude,
  altitude,
  accuracy,
}: {
  photoId: string;
  sampleId: string;
  surveyMonth: string;
  requirement: PhotoRequirement;
  driveFileId: string;
  driveUrl: string;
  driveFolderId: string;
  filename: string;
  mimeType: string;
  sizeBytes: string;
  uploadedAt: string;
  capturedAt: string;
  latitude: string;
  longitude: string;
  altitude: string;
  accuracy: string;
}) {
  return [
    photoId,
    sampleId,
    surveyMonth,
    requirement.surveyType,
    requirement.surveyLabel,
    requirement.photoKey,
    requirement.photoType,
    requirement.label,
    requirement.treeNo ?? "",
    requirement.fruitNo ?? "",
    requirement.measurementType ?? "",
    requirement.required ? "Y" : "N",
    driveFileId,
    driveUrl,
    driveFolderId,
    filename,
    mimeType,
    sizeBytes,
    uploadedAt,
    capturedAt,
    latitude,
    longitude,
    altitude,
    accuracy,
    "uploaded",
    requirement.aiExcluded ? "ai_excluded" : "pending",
    requirement.adminReviewRequired ? "Y" : "N",
    "",
    requirement.note ?? "",
  ];
}

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return Boolean(
    value &&
      typeof value === "object" &&
      "arrayBuffer" in value &&
      "size" in value &&
      "type" in value
  );
}
