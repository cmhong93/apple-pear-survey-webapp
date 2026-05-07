import "server-only";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

export type FarmBasicPdfValues = Record<string, string>;

type BoxOptions = {
  fill?: string;
  stroke?: string;
  width?: number;
};

type TextOptions = {
  size?: number;
  weight?: number;
  align?: "start" | "middle" | "end";
  fill?: string;
  maxChars?: number;
};

type DateParts = {
  year?: string;
  month?: string;
  day?: string;
};

type TableCell = {
  text: string;
  x: number;
  width: number;
  fill: string;
  size?: number;
  weight?: number;
  align?: "start" | "middle" | "end";
  maxChars?: number;
};

const pageSize = {
  width: 595.32,
  height: 841.92,
};

const canvas = {
  width: 1586,
  height: 2246,
};

const form = {
  x: 190,
  y: 112,
  width: 1206,
};

const colors = {
  border: "#242424",
  thin: "#777",
  label: "#d9d9d9",
  input: "#fff6c7",
  white: "#fff",
  muted: "#6f6f6f",
};

export async function createFarmBasicPdf(values: FarmBasicPdfValues) {
  const svg = createFarmBasicSvg(values);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([pageSize.width, pageSize.height]);
  const image = await pdf.embedPng(png);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: pageSize.width,
    height: pageSize.height,
  });
  return pdf.save();
}

function createFarmBasicSvg(values: FarmBasicPdfValues) {
  const out: string[] = [];
  const surveyDate = parseDate(values.survey_datetime);
  const bloomCurrent = parseDate(values.bloom_start_current_date);
  const bloomPrevious = parseDate(values.bloom_start_previous_date);
  const bloomNormal = parseDate(values.bloom_start_normal_date);
  const fullCurrent = parseDate(values.full_bloom_current_date);
  const fullPrevious = parseDate(values.full_bloom_previous_date);
  const fullNormal = parseDate(values.full_bloom_normal_date);
  const thin1 = parseDate(values.fruit_thinning_1_date);
  const thin2 = parseDate(values.fruit_thinning_2_date);
  const harvest1 = parseDate(values.expected_harvest_1_date);
  const harvest2 = parseDate(values.expected_harvest_2_date);

  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">`);
  out.push(`<rect width="100%" height="100%" fill="#fff"/>`);
  out.push(`<style>
    text { font-family: "Malgun Gothic", "Noto Sans KR", Arial, sans-serif; fill: #111; dominant-baseline: middle; }
    .title { font-size: 43px; font-weight: 800; }
    .sub { font-size: 25px; font-weight: 600; }
    .label { font-size: 25px; font-weight: 800; }
    .body { font-size: 22px; font-weight: 600; }
    .small { font-size: 18px; font-weight: 600; }
    .tiny { font-size: 15px; font-weight: 500; }
  </style>`);

  text(out, form.x + form.width / 2, 205, "\uC0AC\uACFC\u00B7\uBC30 \uC2E4\uCE21 \uC870\uC0AC \uB18D\uAC00 \uAE30\uBCF8 \uC815\uBCF4 \uC870\uC0AC[\uC0DD\uC721 \uB18D\uAC00]", {
    size: 43,
    weight: 800,
    align: "middle",
  });
  text(out, form.x + 55, 300, "\u25CB \uAE30\uBCF8 \uC815\uBCF4(\uC870\uC0AC \uC77C\uC2DC :", { size: 28, weight: 700 });
  renderDateInline(out, 778, 300, surveyDate, true);
  text(out, 1105, 300, ")", { size: 28, weight: 700 });

  let y = 350;
  row3(out, y, 64, [
    labelCell("\u0049\u0044", 0, 130),
    inputCell(value(values.farm_id), 130, 205),
    labelCell("\uACBD\uC791\uC790", 335, 130),
    inputCell(value(values.farmer_name), 465, 210),
    labelCell("\uC5F0\uB77D\uCC98", 675, 130),
    inputCell(value(values.farmer_contact), 805, 401),
  ]);
  y += 64;
  row3(out, y, 64, [
    labelCell("\uC790\uD0DD\uC8FC\uC18C", 0, 180),
    inputCell(value(values.home_address), 180, 525, { maxChars: 38 }),
    labelCell("\uD488\uC885", 705, 130),
    inputCell(joinValues([values.variety, values.detailed_variety], " / "), 835, 371, { maxChars: 21 }),
  ]);
  y += 64;
  box(out, form.x, y, 180, 74, { fill: colors.label });
  text(out, form.x + 90, y + 25, "\uD544\uC9C0\uC8FC\uC18C", { size: 25, weight: 800, align: "middle" });
  text(out, form.x + 90, y + 51, "(\uACE0\uB3C4 \uD3EC\uD568)", { size: 20, weight: 700, align: "middle" });
  box(out, form.x + 180, y, 700, 74, { fill: colors.input });
  text(out, form.x + 194, y + 37, value(values.plot_address), { size: 21, maxChars: 42 });
  box(out, form.x + 880, y, 326, 74, { fill: colors.input });
  text(out, form.x + 916, y + 23, "(\uACE0\uB3C4)", { size: 20, weight: 700 });
  text(out, form.x + 980, y + 45, withSuffix(values.altitude_m, " m"), { size: 24, weight: 700, align: "middle" });
  text(out, form.x + 1172, y + 45, "m", { size: 27, weight: 700, align: "middle" });
  y += 74;

  row3(out, y, 70, [
    labelCell("\uD574\uB2F9\uD544\uC9C0\uBA74\uC801", 0, 210),
    inputCell(value(values.plot_area_pyeong), 210, 260, { align: "end" }),
    whiteText("\uD3C9", 485, 40),
    labelCell("\uD3EC\uC804\uAC70\uB798 \uC5EC\uBD80", 520, 250),
    inputCell("", 770, 436),
  ]);
  circleChoice(out, form.x + 870, y + 35, values.standing_trade_yn, "O");
  circleChoice(out, form.x + 955, y + 35, values.standing_trade_yn, "X");
  text(out, form.x + 870, y + 62, "O", { size: 18, align: "middle" });
  text(out, form.x + 955, y + 62, "X", { size: 18, align: "middle" });
  y += 70;

  box(out, form.x, y, 210, 72, { fill: colors.label });
  textMultiline(out, form.x + 105, y + 36, "\uC7AC\uC2DD\uAC70\uB9AC\n(\uD55C\uADF8\uB8E8 \uB113\uC774)", 23, 25, {
    weight: 800,
    align: "middle",
  });
  box(out, form.x + 210, y, 300, 72, { fill: colors.input });
  box(out, form.x + 510, y, 260, 72, { fill: colors.label });
  text(out, form.x + 640, y + 36, "\uACFC\uC218 \uC138\uBD80 \uD488\uC885", {
    size: 23,
    weight: 800,
    align: "middle",
  });
  box(out, form.x + 770, y, 436, 72, { fill: colors.input });
  text(out, form.x + 988, y + 36, value(values.detailed_variety), {
    size: 22,
    weight: 600,
    align: "middle",
    maxChars: 22,
  });
  text(out, form.x + 245, y + 22, "(\uC5F4\uAC04)", { size: 18, fill: colors.muted });
  text(out, form.x + 310, y + 45, value(values.row_spacing_m), { size: 24, weight: 700, align: "middle" });
  text(out, form.x + 370, y + 45, "m", { size: 22, weight: 700 });
  text(out, form.x + 425, y + 22, "(\uC8FC\uAC04)", { size: 18, fill: colors.muted });
  text(out, form.x + 490, y + 45, value(values.tree_spacing_m), { size: 24, weight: 700, align: "middle" });
  text(out, form.x + 552, y + 45, "m", { size: 22, weight: 700 });
  y += 72;

  box(out, form.x, y, 210, 140, { fill: colors.label });
  text(out, form.x + 105, y + 70, "\uC7AC\uC2DD \uC8FC\uC218", { size: 27, weight: 800, align: "middle" });
  box(out, form.x + 210, y, 510, 140, { fill: colors.input });
  text(out, form.x + 360, y + 38, value(values.planted_tree_count), { size: 24, weight: 700, align: "middle" });
  text(out, form.x + 450, y + 38, "\uC8FC/\uD574\uB2F9\uD544\uC9C0", { size: 20, weight: 700 });
  text(out, form.x + 224, y + 83, "\uC804\uB144\uACFC \uB2E4\uB978 \uC774\uC720", { size: 20, weight: 700 });
  text(out, form.x + 410, y + 83, value(values.tree_count_changed_reason), { size: 18, maxChars: 22 });
  box(out, form.x + 720, y, 210, 70, { fill: colors.label });
  text(out, form.x + 825, y + 35, "\uC7AC\uBC30 \uC218\uD615", { size: 27, weight: 800, align: "middle" });
  box(out, form.x + 930, y, 276, 70, { fill: colors.white });
  text(out, form.x + 1068, y + 35, value(values.training_system), { size: 24, weight: 800, align: "middle", maxChars: 12 });
  box(out, form.x + 720, y + 70, 486, 70, { fill: colors.white });
  text(out, form.x + 735, y + 25, "\uC608: \uC0AC\uACFC \uC8FC\uAC04\uD615, \uC138\uC7A5\uBC29\uCD94\uD615, \uB2E4\uCD95\uD615 \uB4F1", { size: 17, fill: colors.muted, maxChars: 35 });
  text(out, form.x + 735, y + 53, "\uBC30: \uBC30\uC0C1\uD615, Y\uC790\uD615, \uBC29\uC0AC\uC0C1\uD615 \uB4F1", { size: 17, fill: colors.muted, maxChars: 35 });
  y += 140;

  renderBloomBlock(out, y, "\uAC1C\uD654\n\uC2DC\uC791\uC77C\n(\uC804\uCCB4\n10%\n\uAC1C\uD654)", [
    ["\uC62C\uD574\n\uAC1C\uD654\uC77C", bloomCurrent],
    ["\uC804\uB144\n\uAC1C\uD654\uC77C", bloomPrevious],
    ["\uD3C9\uB144\n\uAC1C\uD654\uC77C", bloomNormal],
  ]);
  renderAmountBlock(out, form.x + 720, y, "\uCC29\uD654\uB7C9", values.flowering_amount_vs_previous, values.flowering_amount_vs_normal);
  y += 220;

  renderBloomBlock(out, y, "\uB9CC\uAC1C\uAE30\n(\uC804\uCCB4\n80%\n\uAC1C\uD654)", [
    ["\uC62C\uD574\n\uB9CC\uAC1C\uC77C", fullCurrent],
    ["\uC804\uB144\n\uB9CC\uAC1C\uC77C", fullPrevious],
    ["\uD3C9\uB144\n\uB9CC\uAC1C\uC77C", fullNormal],
  ]);
  renderFruitSetAndDamage(out, form.x + 720, y, values);
  y += 280;

  renderAmountOnly(out, form.x, y - 60, "\uB9CC\uAC1C\uB7C9\n(\uC804\uB144\uB300\uBE44)", values.full_bloom_amount_vs_previous);
  renderAmountOnly(out, form.x, y + 10, "\uB9CC\uAC1C\uB7C9\n(\uD3C9\uB144\uB300\uBE44)", values.full_bloom_amount_vs_normal);

  renderSchedule(out, y + 100, "\uC801\uACFC\uC77C\n(\uC608\uC815\uC77C)", thin1, thin2, form.x, 540);
  renderSchedule(out, y + 100, "\uC218\uD655\uC608\uC815\uC77C", harvest1, harvest2, form.x + 720, 486);
  y += 240;

  box(out, form.x, y, 210, 118, { fill: colors.label });
  textMultiline(out, form.x + 105, y + 59, "\uD2B9\uC774\uC0AC\uD56D\n(\uAE30\uD0C0)", 29, 31, { weight: 800, align: "middle" });
  box(out, form.x + 210, y, form.width - 210, 118, { fill: colors.white });
  text(out, form.x + 230, y + 59, value(values.farm_basic_notes), { size: 20, maxChars: 70 });

  line(out, form.x, y + 118, form.x + form.width, y + 118, 4);
  out.push("</svg>");
  return out.join("\n");
}

function renderBloomBlock(out: string[], y: number, leftLabel: string, rows: Array<[string, DateParts]>) {
  box(out, form.x, y, 120, 220, { fill: colors.label });
  textMultiline(out, form.x + 60, y + 110, leftLabel, 27, 34, { weight: 800, align: "middle" });
  rows.forEach(([label, date], index) => {
    const rowY = y + index * 73;
    box(out, form.x + 120, rowY, 110, 73, { fill: colors.label });
    box(out, form.x + 230, rowY, 490, 73, { fill: colors.white });
    if (index > 0) line(out, form.x + 230, rowY, form.x + 720, rowY, 2, "4 4");
    textMultiline(out, form.x + 175, rowY + 36, label, 23, 26, { weight: 800, align: "middle" });
    renderMonthDay(out, form.x + 355, rowY + 36, date);
  });
}

function renderAmountBlock(out: string[], x: number, y: number, title: string, previous: string, normal: string) {
  box(out, x, y, 210, 220, { fill: colors.label });
  text(out, x + 105, y + 110, title, { size: 28, weight: 800, align: "middle" });
  renderAmountRow(out, x + 210, y, "\uC804\uB144\n\uB300\uBE44", previous);
  renderAmountRow(out, x + 210, y + 110, "\uD3C9\uB144\n\uB300\uBE44", normal);
}

function renderAmountOnly(out: string[], x: number, y: number, title: string, valueText: string) {
  box(out, x, y, 230, 70, { fill: colors.label });
  box(out, x + 230, y, 490, 70, { fill: colors.white });
  textMultiline(out, x + 115, y + 35, title, 22, 24, { weight: 800, align: "middle" });
  renderChoices(out, x + 270, y + 35, valueText);
}

function renderAmountRow(out: string[], x: number, y: number, label: string, valueText: string) {
  box(out, x, y, 120, 110, { fill: colors.label });
  box(out, x + 120, y, 366, 110, { fill: colors.white });
  textMultiline(out, x + 60, y + 55, label, 23, 27, { weight: 800, align: "middle" });
  renderChoices(out, x + 150, y + 55, valueText);
}

function renderChoices(out: string[], x: number, y: number, valueText: string) {
  const options = [
    ["\uC801\uC74C", 0],
    ["\uB2E4\uC18C\n\uC801\uC74C", 70],
    ["\uBE44\uC2B7", 145],
    ["\uB2E4\uC18C\n\uB9CE\uC74C", 220],
    ["\uB9CE\uC74C", 300],
  ] as const;
  options.forEach(([label, dx]) => {
    textMultiline(out, x + dx, y + 23, label, 18, 19, { align: "middle" });
    if (matchesOption(valueText, label.replace("\n", " "))) ellipse(out, x + dx, y - 8, 34, 20);
  });
}

function renderFruitSetAndDamage(out: string[], x: number, y: number, values: FarmBasicPdfValues) {
  box(out, x, y, 210, 140, { fill: colors.label });
  textMultiline(out, x + 105, y + 70, "\uCD5C\uC885\n\uCC29\uACFC\uC218\n(\uACFC\uC218\uB2F9)", 24, 30, { weight: 800, align: "middle" });
  const rows = [
    ["\uC62C\uD574\n\uBAA9\uD45C", values.fruit_set_target_count_current],
    ["\uC804\uB144", values.fruit_set_count_previous_year],
    ["\uD3C9\uB144", values.fruit_set_count_normal_year],
  ];
  rows.forEach(([label, count], index) => {
    const rowY = y + index * 46;
    box(out, x + 210, rowY, 276, 46, { fill: colors.white });
    textMultiline(out, x + 245, rowY + 23, label, 20, 20, { weight: 800, align: "middle" });
    text(out, x + 315, rowY + 23, "1\uADF8\uB8E8 \uB2F9", { size: 21 });
    text(out, x + 450, rowY + 23, withSuffix(count, "\uAC1C"), { size: 21, weight: 700, align: "end" });
  });

  const damageY = y + 140;
  box(out, x, damageY, 210, 140, { fill: colors.label });
  textMultiline(out, x + 105, damageY + 70, "\uC800\uC628\n\uD53C\uD574\n(%)", 25, 32, { weight: 800, align: "middle" });
  renderDamageYear(out, x + 210, damageY, "2026\uB144", values.cold_damage_2026_rate, values.cold_damage_2026_no_fruit_set_rate, values.cold_damage_2026_quality_decline_rate);
  renderDamageYear(out, x + 210, damageY + 70, "2025\uB144", values.cold_damage_2025_rate, values.cold_damage_2025_no_fruit_set_rate, values.cold_damage_2025_quality_decline_rate);
}

function renderDamageYear(out: string[], x: number, y: number, year: string, rate: string, noFruit: string, quality: string) {
  box(out, x, y, 95, 70, { fill: colors.label });
  box(out, x + 95, y, 391, 70, { fill: colors.white });
  text(out, x + 47, y + 35, year, { size: 24, weight: 800, align: "middle" });
  text(out, x + 120, y + 21, "\uD53C\uD574\uBE44\uC911", { size: 19, weight: 700 });
  text(out, x + 345, y + 21, withSuffix(rate, "%"), { size: 20, weight: 700, align: "end" });
  text(out, x + 120, y + 52, "\uCC29\uACFC\uBD88\uB2A5", { size: 19, weight: 700 });
  text(out, x + 250, y + 52, withSuffix(noFruit, "%"), { size: 20, weight: 700, align: "end" });
  text(out, x + 280, y + 52, "\uD488\uC704\uC800\uD558", { size: 19, weight: 700 });
  text(out, x + 375, y + 52, withSuffix(quality, "%"), { size: 20, weight: 700, align: "end" });
}

function renderSchedule(out: string[], y: number, title: string, first: DateParts, second: DateParts, x: number, width: number) {
  box(out, x, y, 210, 120, { fill: colors.label });
  box(out, x + 210, y, width - 210, 120, { fill: colors.white });
  textMultiline(out, x + 105, y + 60, title, 26, 31, { weight: 800, align: "middle" });
  text(out, x + 230, y + 33, "(1\uCC28)", { size: 22, weight: 700 });
  renderMonthDay(out, x + 355, y + 33, first);
  line(out, x + 210, y + 60, x + width, y + 60, 2, "4 4");
  text(out, x + 230, y + 93, "(2\uCC28)", { size: 22, weight: 700 });
  renderMonthDay(out, x + 355, y + 93, second);
}

function row3(out: string[], y: number, height: number, cells: TableCell[]) {
  cells.forEach((cell) => {
    box(out, form.x + cell.x, y, cell.width, height, { fill: cell.fill });
    if (cell.text) {
      text(out, form.x + cell.x + cell.width / 2, y + height / 2, cell.text, {
        size: cell.size ?? 24,
        weight: cell.weight ?? 800,
        align: cell.align ?? "middle",
        maxChars: cell.maxChars,
      });
    }
  });
}

function labelCell(textValue: string, x: number, width: number): TableCell {
  return { text: textValue, x, width, fill: colors.label, align: "middle" as const, weight: 800 };
}

function inputCell(textValue: string, x: number, width: number, opts: TextOptions = {}): TableCell {
  return { text: textValue, x, width, fill: colors.input, align: opts.align ?? "middle", size: opts.size ?? 22, weight: opts.weight ?? 600, maxChars: opts.maxChars };
}

function whiteText(textValue: string, x: number, width: number): TableCell {
  return { text: textValue, x, width, fill: colors.input, align: "middle" as const, size: 23, weight: 700 };
}

function renderDateInline(out: string[], x: number, y: number, date: DateParts, includeYear = false) {
  if (includeYear) {
    text(out, x, y, date.year ?? "", { size: 24, weight: 700, align: "middle" });
    text(out, x + 70, y, "\uB144", { size: 25, weight: 700, align: "middle" });
  }
  text(out, x + 180, y, date.month ?? "", { size: 24, weight: 700, align: "middle" });
  text(out, x + 250, y, "\uC6D4", { size: 25, weight: 700, align: "middle" });
  text(out, x + 315, y, date.day ?? "", { size: 24, weight: 700, align: "middle" });
  text(out, x + 375, y, "\uC77C", { size: 25, weight: 700, align: "middle" });
}

function renderMonthDay(out: string[], x: number, y: number, date: DateParts) {
  text(out, x, y, date.month ?? "", { size: 23, weight: 700, align: "middle" });
  text(out, x + 70, y, "\uC6D4", { size: 23, weight: 700, align: "middle" });
  text(out, x + 135, y, date.day ?? "", { size: 23, weight: 700, align: "middle" });
  text(out, x + 200, y, "\uC77C", { size: 23, weight: 700, align: "middle" });
}

function box(out: string[], x: number, y: number, width: number, height: number, opts: BoxOptions = {}) {
  out.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${opts.fill ?? colors.white}" stroke="${opts.stroke ?? colors.border}" stroke-width="${opts.width ?? 2}"/>`);
}

function line(out: string[], x1: number, y1: number, x2: number, y2: number, width = 2, dash = "") {
  out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colors.border}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`);
}

function text(out: string[], x: number, y: number, textValue: string, opts: TextOptions = {}) {
  const size = opts.size ?? 22;
  const align = opts.align ?? "start";
  const weight = opts.weight ?? 600;
  const fill = opts.fill ?? "#111";
  const display = clipText(normalizePdfValue(textValue), opts.maxChars);
  if (!display) return;
  out.push(`<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" text-anchor="${align}" fill="${fill}">${escapeXml(display)}</text>`);
}

function textMultiline(out: string[], x: number, y: number, textValue: string, size: number, lineHeight: number, opts: TextOptions = {}) {
  const lines = textValue.split("\n");
  const firstY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((lineText, index) =>
    text(out, x, firstY + index * lineHeight, lineText, {
      ...opts,
      size,
    })
  );
}

function ellipse(out: string[], x: number, y: number, rx = 38, ry = 22) {
  out.push(`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="none" stroke="#111" stroke-width="4"/>`);
}

function circleChoice(out: string[], x: number, y: number, input: string, option: string) {
  if (matchesOption(input, option)) ellipse(out, x, y, 38, 22);
}

function parseDate(value = ""): DateParts {
  const textValue = normalizePdfValue(value);
  const digits = textValue.replace(/\D/g, "");
  if (digits.length >= 8) {
    return {
      year: digits.slice(0, 4),
      month: digits.slice(4, 6),
      day: digits.slice(6, 8),
    };
  }
  if (digits.length === 4) {
    return { month: digits.slice(0, 2), day: digits.slice(2, 4) };
  }
  const match = textValue.match(/(\d{1,2})\D+(\d{1,2})/);
  if (match) {
    return {
      month: match[1].padStart(2, "0"),
      day: match[2].padStart(2, "0"),
    };
  }
  return {};
}

function matchesOption(input = "", option: string) {
  const valueText = normalizeChoice(input);
  const optionText = normalizeChoice(option);
  if (!valueText || !optionText) return false;
  return valueText === optionText || valueText.includes(optionText) || optionText.includes(valueText);
}

function normalizeChoice(valueText = "") {
  return String(valueText)
    .replace(/\s+/g, "")
    .replace(/[()]/g, "")
    .trim()
    .toUpperCase();
}

function normalizePdfValue(valueText = "") {
  return String(valueText).replace(/\s+/g, " ").trim();
}

function value(valueText = "") {
  return normalizePdfValue(valueText);
}

function joinValues(values: Array<string | undefined>, separator: string) {
  return values.map((item) => value(item ?? "")).filter(Boolean).join(separator);
}

function withSuffix(valueText = "", suffix: string) {
  const textValue = value(valueText);
  if (!textValue) return "";
  return textValue.endsWith(suffix.trim()) ? textValue : `${textValue}${suffix}`;
}

function clipText(valueText: string, maxChars?: number) {
  if (!maxChars || valueText.length <= maxChars) return valueText;
  return valueText.slice(0, Math.max(0, maxChars - 1));
}

function escapeXml(valueText: string) {
  return valueText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
