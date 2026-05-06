import {
  filterSamplesByAccess,
  readFarmBasicSampleWorkbook,
} from "@/lib/farmBasicSampleWorkbook";
import { createUnauthorizedResponse, getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return createUnauthorizedResponse();

    const workbook = await readFarmBasicSampleWorkbook();
    const samples = filterSamplesByAccess({
      samples: workbook.samples,
      user,
    });

    return Response.json({
      samples,
      totalCount: workbook.totalCount,
      columnCount: workbook.columnCount,
      columns: workbook.columns,
      sheetName: "sample_list_raw",
      access: {
        role: user.role,
        surveyorId: user.surveyorId,
        filtered: user.role !== "admin",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "표본 리스트 로딩 중 알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
