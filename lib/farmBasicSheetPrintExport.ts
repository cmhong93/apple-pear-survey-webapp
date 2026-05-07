import "server-only";
import {
  batchUpdateSheetValues,
  batchUpdateSpreadsheet,
  exportSheetToPdf,
  getSpreadsheetMetadata,
  type SheetValueUpdate,
} from "@/lib/googleSheets";

export type FarmBasicPrintValues = Record<string, string>;

type CellMapping = {
  fieldId: string;
  cell: string;
  transform?: (value: string, values: FarmBasicPrintValues) => string;
};

const defaultTemplateSheetName = "print_template_farm_basic";

const valueMappings: CellMapping[] = [
  { fieldId: "survey_datetime", cell: "E2" },
  { fieldId: "farm_id", cell: "C6" },
  { fieldId: "farmer_name", cell: "F6" },
  { fieldId: "farmer_contact", cell: "I6" },
  { fieldId: "home_address", cell: "C7" },
  { fieldId: "variety", cell: "I7", transform: (_, values) => joinValues([values.variety, values.detailed_variety], " / ") },
  { fieldId: "plot_address", cell: "C8" },
  { fieldId: "altitude_m", cell: "I8" },
  { fieldId: "plot_area_pyeong", cell: "C9" },
  { fieldId: "standing_trade_yn", cell: "I9" },
  { fieldId: "row_spacing_m", cell: "C10" },
  { fieldId: "tree_spacing_m", cell: "D10" },
  { fieldId: "detailed_variety", cell: "I10" },
  { fieldId: "planted_tree_count", cell: "C11" },
  { fieldId: "tree_count_changed_reason", cell: "C12" },
  { fieldId: "training_system", cell: "I11" },
  { fieldId: "bloom_start_current_date", cell: "C14", transform: monthDay },
  { fieldId: "bloom_start_previous_date", cell: "C15", transform: monthDay },
  { fieldId: "bloom_start_normal_date", cell: "C16", transform: monthDay },
  { fieldId: "full_bloom_current_date", cell: "C18", transform: monthDay },
  { fieldId: "full_bloom_previous_date", cell: "C19", transform: monthDay },
  { fieldId: "full_bloom_normal_date", cell: "C20", transform: monthDay },
  { fieldId: "flowering_amount_vs_previous", cell: "I14" },
  { fieldId: "flowering_amount_vs_normal", cell: "I15" },
  { fieldId: "full_bloom_amount_vs_previous", cell: "C22" },
  { fieldId: "full_bloom_amount_vs_normal", cell: "C23" },
  { fieldId: "fruit_set_target_count_current", cell: "I17" },
  { fieldId: "fruit_set_count_previous_year", cell: "I18" },
  { fieldId: "fruit_set_count_normal_year", cell: "I19" },
  { fieldId: "cold_damage_2026_rate", cell: "I21" },
  { fieldId: "cold_damage_2026_no_fruit_set_rate", cell: "J21" },
  { fieldId: "cold_damage_2026_quality_decline_rate", cell: "K21" },
  { fieldId: "cold_damage_2025_rate", cell: "I22" },
  { fieldId: "cold_damage_2025_no_fruit_set_rate", cell: "J22" },
  { fieldId: "cold_damage_2025_quality_decline_rate", cell: "K22" },
  { fieldId: "fruit_thinning_1_date", cell: "C25", transform: monthDay },
  { fieldId: "fruit_thinning_2_date", cell: "C26", transform: monthDay },
  { fieldId: "expected_harvest_1_date", cell: "I25", transform: monthDay },
  { fieldId: "expected_harvest_2_date", cell: "I26", transform: monthDay },
  { fieldId: "farm_basic_notes", cell: "C28" },
];

export function getFarmBasicPrintTemplateConfig(defaultSpreadsheetId: string) {
  return {
    spreadsheetId:
      process.env.GOOGLE_SHEETS_PRINT_TEMPLATE_SPREADSHEET_ID ||
      defaultSpreadsheetId,
    templateSheetName:
      process.env.GOOGLE_SHEETS_FARM_BASIC_PRINT_TEMPLATE_SHEET ||
      defaultTemplateSheetName,
    keepGeneratedSheet:
      process.env.GOOGLE_SHEETS_KEEP_PRINT_SHEET === "1" ||
      process.env.GOOGLE_SHEETS_KEEP_PRINT_SHEET === "true",
  };
}

export async function createFarmBasicPdfFromSheetTemplate({
  spreadsheetId,
  templateSheetName,
  values,
}: {
  spreadsheetId: string;
  templateSheetName: string;
  values: FarmBasicPrintValues;
}) {
  const template = await findSheetByTitle(spreadsheetId, templateSheetName);
  const generatedTitle = `print_${sanitizeSheetTitle(values.farm_id || "sample")}_${Date.now()}`;
  const duplicated = await duplicateSheet({
    spreadsheetId,
    sourceSheetId: template.sheetId,
    title: generatedTitle,
  });

  try {
    await batchUpdateSheetValues({
      spreadsheetId,
      updates: createValueUpdates({
        sheetName: generatedTitle,
        values,
      }),
    });

    return {
      pdfBytes: await exportSheetToPdf({
        spreadsheetId,
        sheetId: duplicated.sheetId,
      }),
      generatedSheetId: duplicated.sheetId,
      generatedSheetName: generatedTitle,
    };
  } catch (error) {
    await deleteSheetQuietly(spreadsheetId, duplicated.sheetId);
    throw error;
  }
}

export async function deleteGeneratedPrintSheet({
  spreadsheetId,
  sheetId,
}: {
  spreadsheetId: string;
  sheetId: number;
}) {
  await batchUpdateSpreadsheet({
    spreadsheetId,
    requests: [{ deleteSheet: { sheetId } }],
  });
}

async function findSheetByTitle(spreadsheetId: string, title: string) {
  const metadata = await getSpreadsheetMetadata(spreadsheetId);
  const sheet = metadata.sheets?.find((item) => item.properties?.title === title);
  const sheetId = sheet?.properties?.sheetId;
  if (sheetId === undefined) {
    throw new Error("Google Sheets print template sheet is not configured.");
  }
  return { sheetId, title };
}

async function duplicateSheet({
  spreadsheetId,
  sourceSheetId,
  title,
}: {
  spreadsheetId: string;
  sourceSheetId: number;
  title: string;
}) {
  const response = await batchUpdateSpreadsheet({
    spreadsheetId,
    requests: [
      {
        duplicateSheet: {
          sourceSheetId,
          newSheetName: title,
        },
      },
    ],
  });
  const properties = response.replies?.[0]?.duplicateSheet?.properties;
  if (properties?.sheetId === undefined || !properties.title) {
    throw new Error("Google Sheets print sheet duplication failed.");
  }
  return { sheetId: properties.sheetId, title: properties.title };
}

function createValueUpdates({
  sheetName,
  values,
}: {
  sheetName: string;
  values: FarmBasicPrintValues;
}): SheetValueUpdate[] {
  return valueMappings.map((mapping) => {
    const rawValue = values[mapping.fieldId] ?? "";
    const printValue = mapping.transform
      ? mapping.transform(rawValue, values)
      : rawValue;
    return {
      range: `${quoteSheetName(sheetName)}!${mapping.cell}`,
      values: [[printValue]],
    };
  });
}

async function deleteSheetQuietly(spreadsheetId: string, sheetId: number) {
  try {
    await deleteGeneratedPrintSheet({ spreadsheetId, sheetId });
  } catch {
    // Best-effort cleanup only. The export route returns the original failure.
  }
}

function monthDay(value: string) {
  const parsed = parseDate(value);
  if (!parsed.month || !parsed.day) return "";
  return `${parsed.month}-${parsed.day}`;
}

function parseDate(value = "") {
  const text = String(value).trim();
  const digits = text.replace(/\D/g, "");
  if (digits.length >= 8) {
    return { year: digits.slice(0, 4), month: digits.slice(4, 6), day: digits.slice(6, 8) };
  }
  if (digits.length === 4) {
    return { month: digits.slice(0, 2), day: digits.slice(2, 4) };
  }
  const match = text.match(/(\d{1,2})\D+(\d{1,2})/);
  if (!match) return {};
  return {
    month: match[1].padStart(2, "0"),
    day: match[2].padStart(2, "0"),
  };
}

function joinValues(values: Array<string | undefined>, separator: string) {
  return values
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .join(separator);
}

function sanitizeSheetTitle(value: string) {
  return value.replace(/[\[\]*?/\\:]/g, "_").slice(0, 40);
}

function quoteSheetName(sheetName: string) {
  return `'${sheetName.replace(/'/g, "''")}'`;
}
