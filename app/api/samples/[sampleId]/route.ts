import { createUnauthorizedResponse, getSessionUser } from "@/lib/auth";
import {
  canAccessSample,
  readFarmBasicSampleWorkbook,
} from "@/lib/farmBasicSampleWorkbook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sampleId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return createUnauthorizedResponse();

    const { sampleId } = await context.params;
    const workbook = await readFarmBasicSampleWorkbook();
    const sample = workbook.samples.find((item) => item.sampleId === sampleId);

    if (!sample) {
      return Response.json({ error: "표본을 찾을 수 없습니다." }, { status: 404 });
    }

    if (!canAccessSample(sample, user)) {
      return Response.json({ error: "조회 권한이 없습니다." }, { status: 403 });
    }

    return Response.json({ sample });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "표본 상세 조회 중 알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
