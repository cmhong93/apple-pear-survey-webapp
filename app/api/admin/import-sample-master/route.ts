import { createUnauthorizedResponse, getSessionUser } from "@/lib/auth";
import {
  readLocalSampleMasterWorkbook,
  sampleMasterHeaders,
  sampleToMasterRow,
} from "@/lib/farmBasicSampleWorkbook";
import { getGoogleSheetsConfig, replaceSheetRows } from "@/lib/googleSheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return createUnauthorizedResponse();
  if (user.role !== "admin") {
    return Response.json({ error: "admin access required." }, { status: 403 });
  }

  const config = getGoogleSheetsConfig();
  if (!config.spreadsheetId) {
    return Response.json(
      { error: "GOOGLE_SHEETS_SPREADSHEET_ID is not configured." },
      { status: 500 }
    );
  }

  const workbook = await readLocalSampleMasterWorkbook();
  const rows = workbook.samples.map(sampleToMasterRow);

  await replaceSheetRows({
    spreadsheetId: config.spreadsheetId,
    sheetName: "sample_master",
    headers: sampleMasterHeaders,
    rows,
  });

  return Response.json({
    imported: rows.length,
    columnCount: sampleMasterHeaders.length,
    sheetName: "sample_master",
  });
}
