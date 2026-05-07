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
  { fieldId: "survey_datetime", cell: "C3", transform: dateYear },
  { fieldId: "survey_datetime", cell: "E3", transform: dateMonth },
  { fieldId: "survey_datetime", cell: "G3", transform: dateDay },
  { fieldId: "farm_id", cell: "C5" },
  { fieldId: "farmer_name", cell: "E5" },
  { fieldId: "farmer_contact", cell: "G5" },
  { fieldId: "home_address", cell: "C6" },
  { fieldId: "variety", cell: "G6", transform: (_, values) => joinUniqueValues([values.variety, values.detailed_variety], " / ") },
  { fieldId: "plot_address", cell: "C7" },
  { fieldId: "altitude_m", cell: "G7" },
  { fieldId: "plot_area_pyeong", cell: "C8" },
  { fieldId: "standing_trade_yn", cell: "H8" },
  { fieldId: "row_spacing_m", cell: "C9" },
  { fieldId: "tree_spacing_m", cell: "E9" },
  { fieldId: "detailed_variety", cell: "H9" },
  { fieldId: "planted_tree_count", cell: "C10" },
  { fieldId: "training_system", cell: "H10" },
  { fieldId: "tree_count_changed_reason", cell: "D11" },
  { fieldId: "bloom_start_current_date", cell: "C12", transform: monthDay },
  { fieldId: "bloom_start_previous_date", cell: "C13", transform: monthDay },
  { fieldId: "bloom_start_normal_date", cell: "C14", transform: monthDay },
  { fieldId: "full_bloom_current_date", cell: "C15", transform: monthDay },
  { fieldId: "full_bloom_previous_date", cell: "C16", transform: monthDay },
  { fieldId: "full_bloom_normal_date", cell: "C17", transform: monthDay },
  { fieldId: "flowering_amount_vs_previous", cell: "F12" },
  { fieldId: "flowering_amount_vs_normal", cell: "F13" },
  { fieldId: "fruit_set_target_count_current", cell: "G14" },
  { fieldId: "fruit_set_count_previous_year", cell: "G15" },
  { fieldId: "fruit_set_count_normal_year", cell: "G16" },
  { fieldId: "full_bloom_amount_vs_previous", cell: "C18" },
  { fieldId: "full_bloom_amount_vs_normal", cell: "C19" },
  { fieldId: "cold_damage_2026_rate", cell: "F18" },
  { fieldId: "cold_damage_2026_no_fruit_set_rate", cell: "G18" },
  { fieldId: "cold_damage_2026_quality_decline_rate", cell: "H18" },
  { fieldId: "cold_damage_2025_rate", cell: "F19" },
  { fieldId: "cold_damage_2025_no_fruit_set_rate", cell: "G19" },
  { fieldId: "cold_damage_2025_quality_decline_rate", cell: "H19" },
  { fieldId: "fruit_thinning_1_date", cell: "C20", transform: monthDay },
  { fieldId: "fruit_thinning_2_date", cell: "C21", transform: monthDay },
  { fieldId: "expected_harvest_1_date", cell: "F20", transform: monthDay },
  { fieldId: "expected_harvest_2_date", cell: "F21", transform: monthDay },
  { fieldId: "farm_basic_notes", cell: "C22" },
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
  const template = await ensureFarmBasicTemplate({ spreadsheetId, title: templateSheetName });
  const generatedTitle = `print_${sanitizeSheetTitle(values.farm_id || "sample")}_${Date.now()}`;
  const generated = await createGeneratedFarmBasicPrintSheet({
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
        sheetId: generated.sheetId,
      }),
      generatedSheetId: generated.sheetId,
      generatedSheetName: generatedTitle,
    };
  } catch (error) {
    await deleteSheetQuietly(spreadsheetId, generated.sheetId);
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
    throw new Error(`Google Sheets print template sheet not found: ${title}`);
  }
  return { sheetId, title };
}

async function ensureFarmBasicTemplate({
  spreadsheetId,
  title,
}: {
  spreadsheetId: string;
  title: string;
}) {
  return findSheetByTitle(spreadsheetId, title);
}

async function createGeneratedFarmBasicPrintSheet({
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
          insertSheetIndex: 1,
          newSheetName: title,
        },
      },
    ],
  });
  const properties = response.replies?.[0]?.duplicateSheet?.properties;
  if (properties?.sheetId === undefined || !properties.title) {
    throw new Error("Google Sheets print template duplication failed.");
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

function dateYear(value: string) {
  return parseDate(value).year || "";
}

function dateMonth(value: string) {
  return parseDate(value).month || "";
}

function dateDay(value: string) {
  return parseDate(value).day || "";
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

function joinUniqueValues(values: Array<string | undefined>, separator: string) {
  const seen = new Set<string>();
  return values
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.replace(/\s+/g, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(separator);
}

function sanitizeSheetTitle(value: string) {
  return value.replace(/[\[\]*?/\\:]/g, "_").slice(0, 40);
}

function quoteSheetName(sheetName: string) {
  return `'${sheetName.replace(/'/g, "''")}'`;
}
