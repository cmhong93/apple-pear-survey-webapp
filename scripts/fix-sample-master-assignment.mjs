import { createSign, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
const googleTokenUrl = "https://oauth2.googleapis.com/token";
const sheetsBaseUrl = "https://sheets.googleapis.com/v4/spreadsheets";
const sheetName = "sample_master";
const operationMonth = "202606";

await loadDotEnv(envPath);

const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
if (!spreadsheetId) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is missing.");

const accessToken = await getAccessToken();
const values = await readValues({
  spreadsheetId,
  accessToken,
  range: `'${sheetName}'!A:Z`,
});
const existingHeaders = values[0] ?? [];
const sourceRows = values.slice(1).filter((row) =>
  row.some((value) => String(value ?? "").trim())
);
const headers = ensureHeaders(existingHeaders, [
  "assigned_team_id",
  "assignment_status",
  "assignment_note",
]);
const rows = sourceRows.map((row) => normalizeRowLength(row, headers.length));

const sigunguIndex = headers.indexOf("sigungu");
const surveyMonthIndex = headers.indexOf("survey_month");
const assignedTeamIndex = headers.indexOf("assigned_team");
const assignedTeamIdIndex = headers.indexOf("assigned_team_id");
const assignmentStatusIndex = headers.indexOf("assignment_status");
const assignmentNoteIndex = headers.indexOf("assignment_note");

if (sigunguIndex < 0 || surveyMonthIndex < 0 || assignedTeamIndex < 0) {
  throw new Error("sample_master required assignment columns are missing.");
}

const yesanRows = rows
  .filter((row) => row[sigunguIndex] === "예산군")
  .sort(compareSampleRows);
const cheonanRows = rows
  .filter((row) => row[sigunguIndex] === "천안시")
  .sort(compareSampleRows);
const yesanWestIds = new Set(yesanRows.slice(0, 33).map((row) => row[0]));
const cheonanEastIds = new Set(cheonanRows.slice(0, 2).map((row) => row[0]));

for (const row of rows) {
  const teamId = resolveTeam(row);
  row[surveyMonthIndex] = operationMonth;
  row[assignedTeamIndex] = teamId;
  if (assignedTeamIdIndex >= 0) row[assignedTeamIdIndex] = teamId;
  if (assignmentStatusIndex >= 0) row[assignmentStatusIndex] = teamId ? "assigned" : "";
  if (assignmentNoteIndex >= 0) {
    row[assignmentNoteIndex] = teamId ? "권역 기준 자동배정" : "";
  }
}

await replaceRows({
  spreadsheetId,
  accessToken,
  sheetName,
  headers,
  rows,
});

const teamCounts = countValues(rows.map((row) => row[assignedTeamIndex] || "(blank)"));
const monthCounts = countValues(rows.map((row) => row[surveyMonthIndex] || "(blank)"));
const growthIndex = headers.indexOf("growth_target");
const growthCounts =
  growthIndex >= 0 ? countValues(rows.map((row) => row[growthIndex] || "(blank)")) : {};

console.log(
  JSON.stringify(
    {
      total_samples: rows.length,
      survey_month_202606: monthCounts["202606"] ?? 0,
      survey_month_202605: monthCounts["202605"] ?? 0,
      assigned_team_missing: teamCounts["(blank)"] ?? 0,
      assigned_team_counts: {
        T01: teamCounts.T01 ?? 0,
        T02: teamCounts.T02 ?? 0,
        T03: teamCounts.T03 ?? 0,
        T04: teamCounts.T04 ?? 0,
      },
      growth_target_counts: {
        Y: growthCounts.Y ?? 0,
        N: growthCounts.N ?? 0,
      },
      pii_values_printed: false,
    },
    null,
    2
  )
);

function resolveTeam(row) {
  const sigungu = row[sigunguIndex] ?? "";
  const sampleId = row[0] ?? "";

  if (sigungu === "당진시") return "T01";
  if (sigungu === "아산시") return "T02";
  if (sigungu === "논산시") return "T03";
  if (sigungu === "예산군") return yesanWestIds.has(sampleId) ? "T01" : "T02";
  if (sigungu === "천안시") return cheonanEastIds.has(sampleId) ? "T02" : "T03";
  return "";
}

function compareSampleRows(left, right) {
  return compareSampleIds(left[0] ?? "", right[0] ?? "");
}

function compareSampleIds(left, right) {
  const leftParsed = parseSampleId(left);
  const rightParsed = parseSampleId(right);
  if (leftParsed.prefixOrder !== rightParsed.prefixOrder) {
    return leftParsed.prefixOrder - rightParsed.prefixOrder;
  }
  return leftParsed.number - rightParsed.number;
}

function parseSampleId(value) {
  const [prefix = "", rawNumber = "0"] = String(value).split("-");
  const prefixOrder = prefix === "홍로" ? 1 : prefix === "후지" ? 2 : prefix === "배" ? 3 : 9;
  return { prefixOrder, number: Number(rawNumber) || 0 };
}

async function readValues({ spreadsheetId, accessToken, range }) {
  const response = await fetch(
    `${sheetsBaseUrl}/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!response.ok) throw new Error(`Google Sheets read failed with ${response.status}.`);
  const payload = await response.json();
  return payload.values ?? [];
}

async function replaceRows({ spreadsheetId, accessToken, sheetName, headers, rows }) {
  const endColumn = columnName(headers.length);
  const clearRange = `'${sheetName}'!A:${endColumn}`;
  const clearResponse = await fetch(
    `${sheetsBaseUrl}/${spreadsheetId}/values/${encodeURIComponent(clearRange)}:clear`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!clearResponse.ok) {
    throw new Error(`Google Sheets clear failed with ${clearResponse.status}.`);
  }

  const updateRange = `'${sheetName}'!A1:${endColumn}${rows.length + 1}`;
  const updateResponse = await fetch(
    `${sheetsBaseUrl}/${spreadsheetId}/values/${encodeURIComponent(
      updateRange
    )}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ majorDimension: "ROWS", values: [headers, ...rows] }),
    }
  );
  if (!updateResponse.ok) {
    throw new Error(`Google Sheets update failed with ${updateResponse.status}.`);
  }
}

function ensureHeaders(headers, requiredHeaders) {
  const nextHeaders = [...headers];
  for (const header of requiredHeaders) {
    if (!nextHeaders.includes(header)) nextHeaders.push(header);
  }
  return nextHeaders;
}

function normalizeRowLength(row, length) {
  return Array.from({ length }, (_, index) => row[index] ?? "");
}

function countValues(values) {
  return values.reduce((counts, value) => {
    const key = String(value ?? "").trim() || "(blank)";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

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

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const serviceAccountJson = parseServiceAccountJson();
  const serviceAccountEmail =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? serviceAccountJson?.client_email ?? "";
  const privateKey = (
    process.env.GOOGLE_PRIVATE_KEY ??
    serviceAccountJson?.private_key ??
    ""
  ).replace(/\\n/g, "\n");
  if (!serviceAccountEmail || !privateKey) {
    throw new Error("Google Sheets service account is not configured.");
  }

  const unsigned = `${base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64Url(
    JSON.stringify({
      iss: serviceAccountEmail,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: googleTokenUrl,
      exp: now + 3600,
      iat: now,
      jti: randomUUID(),
    })
  )}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(privateKey);
  const response = await fetch(googleTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${base64Url(signature)}`,
    }),
  });
  if (!response.ok) throw new Error(`Google token request failed with ${response.status}.`);
  return (await response.json()).access_token;
}

function parseServiceAccountJson() {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  if (!encoded) return undefined;

  try {
    return JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  } catch {
    return undefined;
  }
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function columnName(index) {
  let value = index;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}
