import { createUnauthorizedResponse, getSessionUser } from "@/lib/auth";
import {
  canAccessSample,
  readFarmBasicSampleWorkbook,
} from "@/lib/farmBasicSampleWorkbook";
import { downloadDriveFile } from "@/lib/googleDrive";
import {
  getPhotoRequirementsForRoundKey,
  getPhotoRequirementsForTab,
} from "@/data/photoRequirements";
import type { TabId } from "@/types/survey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AiVerifyRequest = {
  sample_id?: string;
  active_tab?: TabId;
  survey_round_key?: string;
  photo_id?: string;
  drive_file_id?: string;
};

type GeminiCandidate = {
  content?: {
    parts?: Array<{ text?: string }>;
  };
};

const allowedStatuses = new Set([
  "normal",
  "warning",
  "retake_recommended",
  "admin_review",
]);

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return createUnauthorizedResponse();

    const body = (await request.json().catch(() => ({}))) as AiVerifyRequest;
    const sampleId = body.sample_id?.trim() ?? "";
    const photoId = body.photo_id?.trim() ?? "";
    const driveFileId = body.drive_file_id?.trim() ?? "";
    const activeTab = body.active_tab;
    const surveyRoundKey = body.survey_round_key?.trim() ?? "";

    if (!sampleId || !photoId || !driveFileId || !activeTab) {
      return Response.json(
        { error: "sample_id, photo_id, drive_file_id and active_tab are required." },
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

    if (requirement.aiExcluded) {
      return Response.json({
        status: "ai_excluded",
        ai_status: "ai_excluded",
        admin_review_required: requirement.adminReviewRequired ? "Y" : "N",
        message: "민감정보 포함 가능 사진은 AI 판독에서 제외하고 관리자 확인 대상으로 처리합니다.",
      });
    }

    const apiKey = process.env.GEMINI_API_KEY ?? "";
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    if (!apiKey) {
      return Response.json({ error: "Gemini API key is not configured." }, { status: 500 });
    }

    const file = await downloadDriveFile(driveFileId);
    const geminiResult = await callGeminiPhotoCheck({
      apiKey,
      model,
      mimeType: file.mimeType,
      imageBase64: Buffer.from(file.data).toString("base64"),
      photoLabel: requirement.label,
      aiPolicy: requirement.note ?? "",
    });

    return Response.json({
      status: "verified",
      ai_status: geminiResult.status,
      admin_review_required:
        geminiResult.status === "admin_review" || requirement.adminReviewRequired
          ? "Y"
          : "N",
      message: geminiResult.message,
    });
  } catch {
    return Response.json({ error: "photo AI verification failed." }, { status: 500 });
  }
}

async function callGeminiPhotoCheck({
  apiKey,
  model,
  mimeType,
  imageBase64,
  photoLabel,
  aiPolicy,
}: {
  apiKey: string;
  model: string;
  mimeType: string;
  imageBase64: string;
  photoLabel: string;
  aiPolicy: string;
}) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  "사진이 조사 요구사항에 맞는지 판단하세요. " +
                  "반드시 JSON만 반환하세요. " +
                  "status는 normal, warning, retake_recommended, admin_review 중 하나입니다. " +
                  "개인정보나 이미지 속 문자를 응답에 그대로 쓰지 마세요. " +
                  `사진 유형: ${photoLabel}. 기준: ${aiPolicy}`,
              },
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    candidates?: GeminiCandidate[];
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const parsed = JSON.parse(text) as { status?: string; message?: string };
  const status = allowedStatuses.has(parsed.status ?? "")
    ? (parsed.status as string)
    : "admin_review";

  return {
    status,
    message: parsed.message || "AI 검증 결과를 확인했습니다.",
  };
}
