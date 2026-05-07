import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

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

const pageSize = {
  width: 595.32,
  height: 841.92,
};
const backgroundPixels = {
  width: 1586,
  height: 2246,
};
const scale = backgroundPixels.width / pageSize.width;

const templateBackgroundPath = path.join(
  process.cwd(),
  "assets",
  "templates",
  "farm_basic_2026_template_bg.png"
);

const textMap: PdfTextItem[] = [
  { fieldId: "farm_id", x: 108, y: 684, maxWidth: 92, align: "center" },
  { fieldId: "farmer_name", x: 264, y: 684, maxWidth: 90, align: "center" },
  { fieldId: "farmer_contact", x: 430, y: 684, maxWidth: 120, align: "center" },
  { fieldId: "home_address", x: 155, y: 655, maxWidth: 250 },
  { fieldId: "variety", x: 472, y: 655, maxWidth: 55, align: "center" },
  { fieldId: "detailed_variety", x: 410, y: 575, maxWidth: 155, align: "center" },
  { fieldId: "plot_address", x: 155, y: 626, maxWidth: 300 },
  { fieldId: "altitude_m", x: 478, y: 626, maxWidth: 45, align: "center", suffix: " m" },
  { fieldId: "plot_area_pyeong", x: 214, y: 596, maxWidth: 70, align: "center" },
  { fieldId: "row_spacing_m", x: 167, y: 565, maxWidth: 42, align: "center" },
  { fieldId: "tree_spacing_m", x: 257, y: 565, maxWidth: 42, align: "center" },
  { fieldId: "planted_tree_count", x: 190, y: 522, maxWidth: 70, align: "center" },
  { fieldId: "tree_count_changed_reason", x: 160, y: 522, maxWidth: 360 },
  { fieldId: "training_system", x: 420, y: 522, maxWidth: 130, align: "center" },
  { fieldId: "training_system_other", x: 472, y: 492, maxWidth: 54 },
  { fieldId: "fruit_set_target_count_current", x: 500, y: 406, maxWidth: 58, align: "center" },
  { fieldId: "fruit_set_count_previous_year", x: 500, y: 379, maxWidth: 58, align: "center" },
  { fieldId: "fruit_set_count_normal_year", x: 500, y: 351, maxWidth: 58, align: "center" },
  { fieldId: "cold_damage_2026_rate", x: 510, y: 304, maxWidth: 48, align: "center" },
  { fieldId: "cold_damage_2026_no_fruit_set_rate", x: 458, y: 279, maxWidth: 42, align: "center" },
  { fieldId: "cold_damage_2026_quality_decline_rate", x: 530, y: 279, maxWidth: 42, align: "center" },
  { fieldId: "cold_damage_2025_rate", x: 510, y: 248, maxWidth: 48, align: "center" },
  { fieldId: "cold_damage_2025_no_fruit_set_rate", x: 458, y: 223, maxWidth: 42, align: "center" },
  { fieldId: "cold_damage_2025_quality_decline_rate", x: 530, y: 223, maxWidth: 42, align: "center" },
  { fieldId: "farm_basic_notes", x: 155, y: 97, size: 8, maxWidth: 370 },
];

const dateMap: DateItem[] = [
  {
    fieldId: "survey_datetime",
    y: 728,
    parts: ["year", "month", "day"],
    x: { year: 214, month: 292, day: 342 },
  },
  {
    fieldId: "bloom_start_current_date",
    y: 452,
    parts: ["month", "day"],
    x: { month: 186, day: 250 },
  },
  {
    fieldId: "bloom_start_previous_date",
    y: 429,
    parts: ["month", "day"],
    x: { month: 186, day: 250 },
  },
  {
    fieldId: "bloom_start_normal_date",
    y: 405,
    parts: ["month", "day"],
    x: { month: 186, day: 250 },
  },
  {
    fieldId: "full_bloom_current_date",
    y: 352,
    parts: ["month", "day"],
    x: { month: 186, day: 250 },
  },
  {
    fieldId: "full_bloom_previous_date",
    y: 328,
    parts: ["month", "day"],
    x: { month: 186, day: 250 },
  },
  {
    fieldId: "full_bloom_normal_date",
    y: 304,
    parts: ["month", "day"],
    x: { month: 186, day: 250 },
  },
  {
    fieldId: "fruit_thinning_1_date",
    y: 184,
    parts: ["month", "day"],
    x: { month: 185, day: 250 },
  },
  {
    fieldId: "fruit_thinning_2_date",
    y: 164,
    parts: ["month", "day"],
    x: { month: 185, day: 250 },
  },
  {
    fieldId: "expected_harvest_1_date",
    y: 184,
    parts: ["month", "day"],
    x: { month: 456, day: 528 },
  },
  {
    fieldId: "expected_harvest_2_date",
    y: 164,
    parts: ["month", "day"],
    x: { month: 456, day: 528 },
  },
];

const circleMap: CircleOption[] = [
  ...options("standing_trade_yn", 584, [
    ["O", 455],
    ["X", 492],
  ]),
  ...amountOptions("flowering_amount_vs_previous", 386, 128),
  ...amountOptions("flowering_amount_vs_normal", 386, 328),
  ...amountOptions("full_bloom_amount_vs_previous", 356, 128),
  ...amountOptions("full_bloom_amount_vs_normal", 356, 328),
];

export async function createFarmBasicPdf(values: FarmBasicPdfValues) {
  const backgroundBytes = await fs.readFile(templateBackgroundPath);
  const composedPng = await sharp(backgroundBytes)
    .composite([{ input: Buffer.from(createOverlaySvg(values)), left: 0, top: 0 }])
    .png()
    .toBuffer();

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([pageSize.width, pageSize.height]);
  const pageImage = await pdf.embedPng(composedPng);
  page.drawImage(pageImage, {
    x: 0,
    y: 0,
    width: pageSize.width,
    height: pageSize.height,
  });

  return pdf.save();
}

function createOverlaySvg(values: FarmBasicPdfValues) {
  const elements = [
    ...textMap.map((item) => renderText(item, values)),
    ...dateMap.flatMap((item) => renderDate(item, values)),
    ...circleMap.map((item) => renderCircle(item, values)),
  ].filter(Boolean);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${backgroundPixels.width}" height="${backgroundPixels.height}" viewBox="0 0 ${backgroundPixels.width} ${backgroundPixels.height}">
    <style>
      text { font-family: "Noto Sans KR", "Malgun Gothic", Arial, sans-serif; fill: #111; font-weight: 500; }
      ellipse { fill: none; stroke: #111; stroke-width: 3; }
    </style>
    ${elements.join("\n")}
  </svg>`;
}

function renderText(item: PdfTextItem, values: FarmBasicPdfValues) {
  const text = normalizePdfValue(values[item.fieldId]);
  if (!text) return "";
  const fontSize = Math.round((item.size ?? 9) * scale);
  const maxWidth = Math.round((item.maxWidth ?? 120) * scale);
  const x = Math.round(item.x * scale);
  const y = toSvgY(item.y, fontSize);
  const clipped = clipPlainText(`${text}${item.suffix ?? ""}`, maxWidth, fontSize);
  const anchor = item.align === "center" ? "middle" : "start";
  const textX = item.align === "center" ? x + maxWidth / 2 : x;

  return `<text x="${textX}" y="${y}" font-size="${fontSize}" text-anchor="${anchor}">${escapeXml(clipped)}</text>`;
}

function renderDate(item: DateItem, values: FarmBasicPdfValues) {
  const date = parsePdfDate(values[item.fieldId]);
  if (!date) return [];

  return item.parts
    .map((part) => {
      const x = item.x[part];
      if (x === undefined) return "";
      return renderText(
        {
          fieldId: part,
          x,
          y: item.y,
          maxWidth: part === "year" ? 42 : 24,
          align: "center",
        },
        date
      );
    })
    .filter(Boolean);
}

function renderCircle(item: CircleOption, values: FarmBasicPdfValues) {
  if (!matchesOption(values[item.fieldId], item.value)) return "";
  return `<ellipse cx="${Math.round(item.x * scale)}" cy="${toSvgY(item.y, 0)}" rx="${Math.round(
    (item.width ?? 14) * scale
  )}" ry="${Math.round((item.height ?? 8) * scale)}" />`;
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
    ["\uC801\uC74C", startX],
    ["\uB2E4\uC18C \uC801\uC74C", startX + 39],
    ["\uBE44\uC2B7", startX + 84],
    ["\uB2E4\uC18C \uB9CE\uC74C", startX + 128],
    ["\uB9CE\uC74C", startX + 173],
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

function toSvgY(pdfY: number, fontSize: number) {
  return Math.round((pageSize.height - pdfY) * scale + fontSize);
}

function clipPlainText(text: string, maxWidth: number, fontSize: number) {
  const approximateCharWidth = fontSize * 0.58;
  const maxChars = Math.max(1, Math.floor(maxWidth / approximateCharWidth));
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
