import { createSign, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { inflateRawSync } from "node:zlib";

const workbookPath = path.join(
  process.cwd(),
  "_handoff",
  "input",
  "sample_source_260506.xlsx"
);
const confirmedGrowthWorkbookPath = path.join(
  process.cwd(),
  "_handoff",
  "farm-basic-sample-list.raw.xlsx"
);
const missingOutputPath = path.join(
  process.cwd(),
  "_handoff",
  "output",
  "survey_case_missing_260506.csv"
);
const envPath = path.join(process.cwd(), ".env.local");
const googleTokenUrl = "https://oauth2.googleapis.com/token";
const sheetsBaseUrl = "https://sheets.googleapis.com/v4/spreadsheets";
const sheetName = "sample_master";
const defaultSurveyMonth = "202605";
const headers = [
  "sample_id",
  "farmer_name",
  "phone",
  "crop_type",
  "variety_group",
  "detail_variety",
  "sido",
  "sigungu",
  "home_address",
  "field_address",
  "survey_month",
  "surveyor_id",
  "survey_case",
  "growth_target",
  "assigned_team",
  "pnu",
  "status",
  "source_row",
  "source_file",
  "raw_json",
];

await loadDotEnv(envPath);

const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!spreadsheetId || !serviceAccountEmail || !privateKey) {
  throw new Error("Google Sheets environment variables are missing.");
}

const workbook = await readWorkbook(workbookPath);
const selectedSheet =
  workbook.sheets.find((sheet) => sheet.name.includes("앱")) ??
  workbook.sheets.find(
    (sheet) => sheet.name.includes("통합명부") && sheet.name.includes("충남")
  ) ??
  workbook.sheets.find((sheet) => sheet.name.includes("통합명부")) ??
  workbook.sheets.find((sheet) => sheet.name.includes("충남")) ??
  workbook.sheets[0];

if (!selectedSheet) throw new Error("No worksheet found.");

const table = parseWorksheet(
  workbook.files.get(selectedSheet.path).toString("utf8"),
  workbook.sharedStrings
);
const sourceHeaders = (table[0] ?? []).map(normalizeColumnName);
const confirmedGrowthIds = await readConfirmedGrowthIds(confirmedGrowthWorkbookPath);
const records = table
  .slice(1)
  .map((row, index) => rowToRecord({ sourceHeaders, row, index, confirmedGrowthIds }))
  .filter((record) => record.sample_id);
const rows = records.map((record) => headers.map((header) => record[header] ?? ""));
const missingSurveyCaseRows = records.filter((record) => !record.survey_case);
await writeMissingSurveyCaseCsv(missingSurveyCaseRows);

const accessToken = await getAccessToken({ serviceAccountEmail, privateKey });
await ensureSheet({ spreadsheetId, accessToken, sheetName });
await replaceRows({ spreadsheetId, accessToken, sheetName, rows });

const sampleIds = records.map((record) => record.sample_id);
const duplicateCount = sampleIds.length - new Set(sampleIds).size;
const summary = {
  source_file: "sample_source_260506.xlsx",
  selected_sheet: selectedSheet.name,
  imported_rows: records.length,
  column_count: headers.length,
  sample_id_duplicates: duplicateCount,
  phone_missing: records.filter((record) => !record.phone).length,
  home_address_missing: records.filter((record) => !record.home_address).length,
  field_address_missing: records.filter((record) => !record.field_address).length,
  survey_case_missing: records.filter((record) => !record.survey_case).length,
  growth_target_y: records.filter((record) => record.growth_target === "Y").length,
  growth_target_n: records.filter((record) => record.growth_target === "N").length,
  assigned_team_missing: records.filter((record) => !record.assigned_team).length,
  surveyor_id_missing: records.filter((record) => !record.surveyor_id).length,
};

console.log(JSON.stringify(summary, null, 2));

async function loadDotEnv(filePath) {
  const text = await fs.readFile(filePath, "utf8").catch(() => "");
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const index = trimmed.indexOf("=");
    if (index === -1) return;
    const key = trimmed.slice(0, index);
    let value = trimmed.slice(index + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  });
}

function rowToRecord({ sourceHeaders, row, index, confirmedGrowthIds }) {
  const raw = Object.fromEntries(
    sourceHeaders.map((header, columnIndex) => [header, row[columnIndex] ?? ""])
  );
  const sourceCrop = raw["품목"] ?? "";
  const crop = normalizeCrop(sourceCrop);
  const variety = normalizeVariety(sourceCrop);
  const surveyDate = raw["조사일"] ?? "";
  const sampleId = raw.ID ?? "";
  const growthTarget = normalizeGrowthTarget(raw, sampleId, confirmedGrowthIds);

  return {
    sample_id: sampleId,
    farmer_name: raw["이름"] ?? "",
    phone: raw["휴대전화"] ?? "",
    crop_type: crop,
    variety_group: variety,
    detail_variety: variety,
    sido: raw["시도"] ?? "",
    sigungu: raw["시군구"] ?? "",
    home_address: raw["자택주소"] ?? "",
    field_address: raw["필지주소"] ?? "",
    survey_month: extractSurveyMonth(surveyDate) || defaultSurveyMonth,
    surveyor_id: raw["조사원"] ?? "",
    survey_case: createSurveyCase(growthTarget),
    growth_target: growthTarget,
    assigned_team: raw.assigned_team ?? "",
    pnu: raw["팜맵 PNU"] ?? "",
    status: normalizeStatus(raw),
    source_row: String(index + 2),
    source_file: "sample_source_260506.xlsx",
    raw_json: JSON.stringify(raw),
  };
}

function normalizeCrop(value) {
  if (value === "홍로" || value === "후지") return "사과";
  if (value === "배") return "배";
  return value;
}

function normalizeVariety(value) {
  if (value === "홍로" || value === "후지") return value;
  if (value === "배") return "신고";
  return value;
}

function normalizeStatus(raw) {
  if (raw["조사 완료"]) return "조사완료";
  if (raw["조사 종료"]) return "조사종료";
  if (raw["조사 대기"]) return "조사대기";
  return "조사대기";
}

function normalizeGrowthTarget(raw, sampleId, confirmedGrowthIds) {
  if (confirmedGrowthIds.size > 0) {
    return confirmedGrowthIds.has(sampleId) ? "Y" : "N";
  }

  return parseExplicitGrowthFlag(raw._source_growth_survey_yn ?? raw.growth_target ?? "");
}

function parseExplicitGrowthFlag(value) {
  const text = String(value ?? "").trim().toUpperCase();
  if (!text) return "N";
  if (["Y", "YES", "TRUE", "1", "O", "○", "●", "대상", "생육", "생육대상"].includes(text)) {
    return "Y";
  }
  return "N";
}

function createSurveyCase(growthTarget) {
  return growthTarget === "Y" ? "면접+생육+생산량" : "면접+생산량";
}

async function writeMissingSurveyCaseCsv(records) {
  await fs.mkdir(path.dirname(missingOutputPath), { recursive: true });
  const csvHeaders = [
    "sample_id",
    "crop_type",
    "variety_group",
    "sido",
    "sigungu",
    "growth_target",
    "survey_case",
  ];
  const lines = [
    csvHeaders.join(","),
    ...records.map((record) =>
      csvHeaders.map((header) => csvEscape(record[header] ?? "")).join(",")
    ),
  ];
  await fs.writeFile(missingOutputPath, `${lines.join("\n")}\n`, "utf8");
}

function csvEscape(value) {
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function extractSurveyMonth(value) {
  const digits = String(value).replace(/\D/g, "");
  return digits.length >= 6 ? digits.slice(0, 6) : "";
}

async function readWorkbook(filePath) {
  const buffer = await fs.readFile(filePath);
  const files = readZipFiles(buffer);
  const workbookXml = files.get("xl/workbook.xml").toString("utf8");
  const relsXml = files.get("xl/_rels/workbook.xml.rels").toString("utf8");
  const sharedStringsXml = files.get("xl/sharedStrings.xml")?.toString("utf8");
  const sharedStrings = sharedStringsXml ? parseSharedStrings(sharedStringsXml) : [];
  const rels = Object.fromEntries(
    [...relsXml.matchAll(/<Relationship\b([^>]*)\/?>/g)].map((match) => {
      const id = match[1].match(/\bId="([^"]+)"/)?.[1] ?? "";
      const target = match[1].match(/\bTarget="([^"]+)"/)?.[1] ?? "";
      const normalizedTarget = target.replace(/^\/+/, "");
      return [
        id,
        normalizedTarget.startsWith("xl/") ? normalizedTarget : `xl/${normalizedTarget}`,
      ];
    })
  );
  const sheets = [...workbookXml.matchAll(/<sheet\b([^>]*)\/?>/g)].map((match) => {
    const name = decodeXml(match[1].match(/\bname="([^"]+)"/)?.[1] ?? "");
    const relId = match[1].match(/\br:id="([^"]+)"/)?.[1] ?? "";
    return { name, path: rels[relId] };
  });

  return { files, sheets, sharedStrings };
}

async function readConfirmedGrowthIds(filePath) {
  const workbook = await readWorkbook(filePath).catch(() => undefined);
  if (!workbook) return new Set();

  const selectedSheet =
    workbook.sheets.find((sheet) => sheet.name === "sample_list_raw") ??
    workbook.sheets.find((sheet) => sheet.name.includes("sample_list")) ??
    workbook.sheets[0];
  if (!selectedSheet) return new Set();

  const table = parseWorksheet(
    workbook.files.get(selectedSheet.path).toString("utf8"),
    workbook.sharedStrings
  );
  const sourceHeaders = (table[0] ?? []).map(normalizeColumnName);
  const sampleIdIndex = sourceHeaders.includes("sample_id")
    ? sourceHeaders.indexOf("sample_id")
    : sourceHeaders.indexOf("farm_id");
  const growthIndex = sourceHeaders.indexOf("_source_growth_survey_yn");
  if (sampleIdIndex < 0 || growthIndex < 0) return new Set();

  return new Set(
    table
      .slice(1)
      .filter((row) => parseExplicitGrowthFlag(row[growthIndex] ?? "") === "Y")
      .map((row) => String(row[sampleIdIndex] ?? "").trim())
      .filter(Boolean)
  );
}

function readZipFiles(buffer) {
  const entries = readCentralDirectory(buffer);
  const files = new Map();

  entries.forEach((entry) => {
    const localOffset = entry.localHeaderOffset;
    const nameLength = buffer.readUInt16LE(localOffset + 26);
    const extraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + nameLength + extraLength;
    const dataEnd = dataStart + entry.compressedSize;
    const data = buffer.subarray(dataStart, dataEnd);

    if (entry.method === 0) files.set(entry.name, data);
    if (entry.method === 8) files.set(entry.name, inflateRawSync(data));
  });

  return files;
}

function readCentralDirectory(buffer) {
  const entries = [];
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    entries.push({
      method: buffer.readUInt16LE(offset + 10),
      compressedSize: buffer.readUInt32LE(offset + 20),
      localHeaderOffset: buffer.readUInt32LE(offset + 42),
      name: buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8"),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(buffer) {
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error("XLSX central directory not found.");
}

function parseSharedStrings(xml) {
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) =>
    decodeXml(
      [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
        .map((textMatch) => textMatch[1])
        .join("")
    )
  );
}

function parseWorksheet(xml, sharedStrings) {
  const rows = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const values = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = attrs.match(/\br="([A-Z]+)\d+"/)?.[1] ?? "";
      const columnIndex = columnNameToIndex(ref);
      const type = attrs.match(/\bt="([^"]+)"/)?.[1] ?? "";
      let value = "";
      if (type === "inlineStr") {
        value = decodeXml(
          [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
            .map((match) => match[1])
            .join("")
        );
      } else {
        const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
        value = type === "s" ? sharedStrings[Number(raw)] ?? "" : decodeXml(raw);
      }
      values[columnIndex] = value;
    }
    rows.push(values.map((value) => value ?? ""));
  }
  return rows;
}

function columnNameToIndex(columnName) {
  return columnName.split("").reduce((sum, char) => {
    return sum * 26 + char.charCodeAt(0) - 64;
  }, 0) - 1;
}

function normalizeColumnName(column) {
  return column.replace(/\s+/g, " ").trim();
}

function decodeXml(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

async function getAccessToken({ serviceAccountEmail, privateKey }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccountEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: googleTokenUrl,
    exp: now + 3600,
    iat: now,
    jti: randomUUID(),
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(
    JSON.stringify(claim)
  )}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(privateKey);
  const assertion = `${unsigned}.${base64Url(signature)}`;
  const response = await fetch(googleTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`Google token request failed: ${response.status}`);
  return (await response.json()).access_token;
}

function base64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function ensureSheet({ spreadsheetId, accessToken, sheetName }) {
  const metadata = await fetch(`${sheetsBaseUrl}/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!metadata.ok) throw new Error(`Sheet metadata failed: ${metadata.status}`);
  const payload = await metadata.json();
  const exists = payload.sheets?.some((sheet) => sheet.properties?.title === sheetName);
  if (exists) return;
  const created = await fetch(`${sheetsBaseUrl}/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title: sheetName } } }],
    }),
  });
  if (!created.ok) throw new Error(`Sheet create failed: ${created.status}`);
}

async function replaceRows({ spreadsheetId, accessToken, sheetName, rows }) {
  const range = `'${sheetName}'!A:T`;
  const clear = await fetch(
    `${sheetsBaseUrl}/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
    { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!clear.ok) throw new Error(`Sheet clear failed: ${clear.status}`);
  const updateRange = `'${sheetName}'!A1:T${rows.length + 1}`;
  const update = await fetch(
    `${sheetsBaseUrl}/${spreadsheetId}/values/${encodeURIComponent(
      updateRange
    )}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [headers, ...rows] }),
    }
  );
  if (!update.ok) throw new Error(`Sheet update failed: ${update.status}`);
}
