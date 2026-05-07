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
  align?: "left" | "center";
  suffix?: string;
};

type DateItem = {
  fieldId: string;
  y: number;
  parts: Array<"year" | "month" | "day">;
  x: Partial<Record<"year" | "month" | "day", number>>;
};

type CircleOption = {
  fieldId: string;
  value: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
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

const black = rgb(0.05, 0.05, 0.05);

const textMap: PdfTextItem[] = [
  { fieldId: "farm_id", x: 72, y: 704, maxWidth: 94, align: "center" },
  { fieldId: "farmer_name", x: 188, y: 704, maxWidth: 88, align: "center" },
  { fieldId: "farmer_contact", x: 312, y: 704, maxWidth: 122, align: "center" },
  { fieldId: "home_address", x: 92, y: 676, maxWidth: 430 },
  { fieldId: "variety", x: 92, y: 648, maxWidth: 108, align: "center" },
  { fieldId: "detailed_variety", x: 246, y: 648, maxWidth: 130, align: "center" },
  { fieldId: "plot_address", x: 92, y: 620, maxWidth: 340 },
  { fieldId: "altitude_m", x: 468, y: 620, maxWidth: 54, align: "center", suffix: " m" },
  { fieldId: "plot_area_pyeong", x: 320, y: 584, maxWidth: 70, align: "center" },
  { fieldId: "row_spacing_m", x: 145, y: 552, maxWidth: 50, align: "center" },
  { fieldId: "tree_spacing_m", x: 260, y: 552, maxWidth: 50, align: "center" },
  { fieldId: "planted_tree_count", x: 425, y: 552, maxWidth: 70, align: "center" },
  { fieldId: "tree_count_changed_reason", x: 160, y: 522, maxWidth: 360 },
  { fieldId: "training_system_other", x: 472, y: 492, maxWidth: 54 },
  { fieldId: "fruit_set_target_count_current", x: 160, y: 318, maxWidth: 75, align: "center" },
  { fieldId: "fruit_set_count_previous_year", x: 287, y: 318, maxWidth: 75, align: "center" },
  { fieldId: "fruit_set_count_normal_year", x: 415, y: 318, maxWidth: 75, align: "center" },
  { fieldId: "cold_damage_2026_rate", x: 160, y: 276, maxWidth: 65, align: "center" },
  { fieldId: "cold_damage_2026_no_fruit_set_rate", x: 287, y: 276, maxWidth: 65, align: "center" },
  { fieldId: "cold_damage_2026_quality_decline_rate", x: 415, y: 276, maxWidth: 65, align: "center" },
  { fieldId: "cold_damage_2025_rate", x: 160, y: 248, maxWidth: 65, align: "center" },
  { fieldId: "cold_damage_2025_no_fruit_set_rate", x: 287, y: 248, maxWidth: 65, align: "center" },
  { fieldId: "cold_damage_2025_quality_decline_rate", x: 415, y: 248, maxWidth: 65, align: "center" },
  { fieldId: "farm_basic_notes", x: 88, y: 160, size: 8, maxWidth: 430 },
];

const dateMap: DateItem[] = [
  {
    fieldId: "survey_datetime",
    y: 762,
    parts: ["year", "month", "day"],
    x: { year: 160, month: 255, day: 326 },
  },
  {
    fieldId: "bloom_start_current_date",
    y: 452,
    parts: ["month", "day"],
    x: { month: 162, day: 204 },
  },
  {
    fieldId: "bloom_start_previous_date",
    y: 452,
    parts: ["month", "day"],
    x: { month: 286, day: 328 },
  },
  {
    fieldId: "bloom_start_normal_date",
    y: 452,
    parts: ["month", "day"],
    x: { month: 410, day: 452 },
  },
  {
    fieldId: "full_bloom_current_date",
    y: 420,
    parts: ["month", "day"],
    x: { month: 162, day: 204 },
  },
  {
    fieldId: "full_bloom_previous_date",
    y: 420,
    parts: ["month", "day"],
    x: { month: 286, day: 328 },
  },
  {
    fieldId: "full_bloom_normal_date",
    y: 420,
    parts: ["month", "day"],
    x: { month: 410, day: 452 },
  },
  {
    fieldId: "fruit_thinning_1_date",
    y: 210,
    parts: ["month", "day"],
    x: { month: 163, day: 205 },
  },
  {
    fieldId: "fruit_thinning_2_date",
    y: 210,
    parts: ["month", "day"],
    x: { month: 253, day: 295 },
  },
  {
    fieldId: "expected_harvest_1_date",
    y: 210,
    parts: ["month", "day"],
    x: { month: 383, day: 425 },
  },
  {
    fieldId: "expected_harvest_2_date",
    y: 210,
    parts: ["month", "day"],
    x: { month: 473, day: 515 },
  },
];

const circleMap: CircleOption[] = [
  ...options("standing_trade_yn", 584, [
    ["O", 132],
    ["X", 166],
  ]),
  ...options("training_system", 492, [
    ["주간형", 120],
    ["세장방추형", 178],
    ["다축형", 252],
    ["Y자형", 306],
    ["배상형", 360],
    ["방사상형", 418],
    ["기타", 468],
  ]),
  ...amountOptions("flowering_amount_vs_previous", 386, 128),
  ...amountOptions("flowering_amount_vs_normal", 386, 328),
  ...amountOptions("full_bloom_amount_vs_previous", 356, 128),
  ...amountOptions("full_bloom_amount_vs_normal", 356, 328),
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
      text: `${text}${item.suffix ?? ""}`,
      x: item.x,
      y: item.y,
      size: item.size ?? 9,
      maxWidth: item.maxWidth ?? 120,
      align: item.align ?? "left",
    });
  });

  dateMap.forEach((item) => {
    const date = parsePdfDate(values[item.fieldId]);
    if (!date) return;
    item.parts.forEach((part) => {
      const x = item.x[part];
      if (x === undefined) return;
      drawClippedText({
        page,
        font,
        text: date[part],
        x,
        y: item.y,
        size: 9,
        maxWidth: part === "year" ? 42 : 24,
        align: "center",
      });
    });
  });

  circleMap.forEach((item) => {
    if (!matchesOption(values[item.fieldId], item.value)) return;
    page.drawEllipse({
      x: item.x,
      y: item.y,
      xScale: item.width ?? 14,
      yScale: item.height ?? 8,
      borderColor: black,
      borderWidth: 1.1,
    });
  });

  return pdf.save();
}

function options(
  fieldId: string,
  y: number,
  values: Array<[value: string, x: number]>
) {
  return values.map(([value, x]) => ({ fieldId, value, x, y }));
}

function amountOptions(fieldId: string, y: number, startX: number) {
  return options(fieldId, y, [
    ["적음", startX],
    ["다소 적음", startX + 39],
    ["비슷", startX + 84],
    ["다소 많음", startX + 128],
    ["많음", startX + 173],
  ]);
}

function normalizePdfValue(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function parsePdfDate(value = "") {
  const text = normalizePdfValue(value);
  if (!text) return undefined;
  const digits = text.replace(/\D/g, "");
  let year = "";
  let month = "";
  let day = "";

  if (digits.length >= 8) {
    year = digits.slice(0, 4);
    month = digits.slice(4, 6);
    day = digits.slice(6, 8);
  } else if (digits.length === 4) {
    month = digits.slice(0, 2);
    day = digits.slice(2, 4);
  } else {
    const match = text.match(/(\d{1,2})\D+(\d{1,2})/);
    if (match) {
      month = match[1].padStart(2, "0");
      day = match[2].padStart(2, "0");
    }
  }

  if (!month || !day) return undefined;
  return { year, month, day };
}

function matchesOption(input = "", option: string) {
  const value = normalizeChoice(input);
  const target = normalizeChoice(option);
  if (!value || !target) return false;
  if (value === target) return true;
  return value.includes(target) || target.includes(value);
}

function normalizeChoice(value = "") {
  return String(value)
    .replace(/\s+/g, "")
    .replace(/[()]/g, "")
    .trim()
    .toUpperCase();
}

function drawClippedText({
  page,
  font,
  text,
  x,
  y,
  size,
  maxWidth,
  align,
}: {
  page: ReturnType<PDFDocument["getPage"]>;
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  text: string;
  x: number;
  y: number;
  size: number;
  maxWidth: number;
  align: "left" | "center";
}) {
  const clipped = clipText({ text, font, size, maxWidth });
  const textWidth = font.widthOfTextAtSize(clipped, size);
  page.drawText(clipped, {
    x: align === "center" ? x + (maxWidth - textWidth) / 2 : x,
    y,
    size,
    font,
    color: black,
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
