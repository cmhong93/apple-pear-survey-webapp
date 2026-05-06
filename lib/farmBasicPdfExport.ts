import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export type FarmBasicPdfValues = Record<string, string>;

type PdfTextItem = {
  fieldId: string;
  x: number;
  y: number;
  size?: number;
  maxWidth?: number;
};

const templatePath = path.join(
  process.cwd(),
  "assets",
  "templates",
  "farm_basic_2026_template.pdf"
);
const fontPath = path.join(
  process.cwd(),
  "assets",
  "fonts",
  "NotoSansKR-VF.ttf"
);

const textMap: PdfTextItem[] = [
  { fieldId: "survey_datetime", x: 140, y: 762, maxWidth: 250 },
  { fieldId: "farm_id", x: 72, y: 704, maxWidth: 90 },
  { fieldId: "farmer_name", x: 190, y: 704, maxWidth: 80 },
  { fieldId: "farmer_contact", x: 318, y: 704, maxWidth: 120 },
  { fieldId: "home_address", x: 92, y: 676, maxWidth: 430 },
  { fieldId: "variety", x: 92, y: 648, maxWidth: 110 },
  { fieldId: "detailed_variety", x: 248, y: 648, maxWidth: 130 },
  { fieldId: "plot_address", x: 92, y: 620, maxWidth: 345 },
  { fieldId: "altitude_m", x: 474, y: 620, maxWidth: 50 },
  { fieldId: "standing_trade_yn", x: 135, y: 584, maxWidth: 50 },
  { fieldId: "plot_area_pyeong", x: 325, y: 584, maxWidth: 70 },
  { fieldId: "row_spacing_m", x: 150, y: 552, maxWidth: 50 },
  { fieldId: "tree_spacing_m", x: 265, y: 552, maxWidth: 50 },
  { fieldId: "planted_tree_count", x: 430, y: 552, maxWidth: 70 },
  { fieldId: "tree_count_changed_reason", x: 160, y: 522, maxWidth: 360 },
  { fieldId: "training_system", x: 140, y: 492, maxWidth: 100 },
  { fieldId: "training_system_other", x: 270, y: 492, maxWidth: 250 },
  { fieldId: "bloom_start_current_date", x: 160, y: 452, maxWidth: 75 },
  { fieldId: "bloom_start_previous_date", x: 285, y: 452, maxWidth: 75 },
  { fieldId: "bloom_start_normal_date", x: 410, y: 452, maxWidth: 75 },
  { fieldId: "full_bloom_current_date", x: 160, y: 420, maxWidth: 75 },
  { fieldId: "full_bloom_previous_date", x: 285, y: 420, maxWidth: 75 },
  { fieldId: "full_bloom_normal_date", x: 410, y: 420, maxWidth: 75 },
  { fieldId: "flowering_amount_vs_previous", x: 210, y: 386, maxWidth: 80 },
  { fieldId: "flowering_amount_vs_normal", x: 410, y: 386, maxWidth: 80 },
  { fieldId: "full_bloom_amount_vs_previous", x: 210, y: 356, maxWidth: 80 },
  { fieldId: "full_bloom_amount_vs_normal", x: 410, y: 356, maxWidth: 80 },
  { fieldId: "fruit_set_target_count_current", x: 165, y: 318, maxWidth: 75 },
  { fieldId: "fruit_set_count_previous_year", x: 292, y: 318, maxWidth: 75 },
  { fieldId: "fruit_set_count_normal_year", x: 420, y: 318, maxWidth: 75 },
  { fieldId: "cold_damage_2026_rate", x: 165, y: 276, maxWidth: 65 },
  { fieldId: "cold_damage_2026_no_fruit_set_rate", x: 292, y: 276, maxWidth: 65 },
  { fieldId: "cold_damage_2026_quality_decline_rate", x: 420, y: 276, maxWidth: 65 },
  { fieldId: "cold_damage_2025_rate", x: 165, y: 248, maxWidth: 65 },
  { fieldId: "cold_damage_2025_no_fruit_set_rate", x: 292, y: 248, maxWidth: 65 },
  { fieldId: "cold_damage_2025_quality_decline_rate", x: 420, y: 248, maxWidth: 65 },
  { fieldId: "fruit_thinning_completion_dates", x: 165, y: 210, maxWidth: 160 },
  { fieldId: "expected_harvest_dates", x: 380, y: 210, maxWidth: 160 },
  { fieldId: "farm_basic_notes", x: 88, y: 160, size: 8, maxWidth: 430 },
];

export async function createFarmBasicPdf(values: FarmBasicPdfValues) {
  const [templateBytes, fontBytes] = await Promise.all([
    fs.readFile(templatePath),
    fs.readFile(fontPath),
  ]);
  const pdf = await PDFDocument.load(templateBytes);
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const page = pdf.getPage(0);

  textMap.forEach((item) => {
    const text = normalizePdfValue(values[item.fieldId]);
    if (!text) return;
    drawClippedText({
      page,
      font,
      text,
      x: item.x,
      y: item.y,
      size: item.size ?? 9,
      maxWidth: item.maxWidth ?? 120,
    });
  });

  return pdf.save();
}

function normalizePdfValue(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function drawClippedText({
  page,
  font,
  text,
  x,
  y,
  size,
  maxWidth,
}: {
  page: ReturnType<PDFDocument["getPage"]>;
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  text: string;
  x: number;
  y: number;
  size: number;
  maxWidth: number;
}) {
  const clipped = clipText({ text, font, size, maxWidth });
  page.drawText(clipped, {
    x,
    y,
    size,
    font,
    color: rgb(0.05, 0.05, 0.05),
  });
}

function clipText({
  text,
  font,
  size,
  maxWidth,
}: {
  text: string;
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  size: number;
  maxWidth: number;
}) {
  let result = text;
  while (result.length > 0 && font.widthOfTextAtSize(result, size) > maxWidth) {
    result = result.slice(0, -1);
  }
  return result;
}
