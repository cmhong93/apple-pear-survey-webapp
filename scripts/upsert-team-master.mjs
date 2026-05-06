import { createSign, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
const googleTokenUrl = "https://oauth2.googleapis.com/token";
const sheetsBaseUrl = "https://sheets.googleapis.com/v4/spreadsheets";
const sheetName = "team_master";

const headers = [
  "team_id",
  "team_name",
  "member_1_id",
  "member_2_id",
  "base_area",
  "assigned_area",
  "vehicle_id",
  "tablet_no",
  "gps_device_no",
  "active_yn",
  "note",
];

const rows = [
  ["T01", "1팀", "", "", "", "", "", "TAB-01", "GPS-01", "Y", ""],
  ["T02", "2팀", "", "", "", "", "", "TAB-02", "GPS-02", "Y", ""],
  ["T03", "3팀", "", "", "", "", "", "TAB-03", "GPS-03", "Y", ""],
  ["T04", "4팀", "", "", "", "", "", "TAB-04", "GPS-04", "Y", ""],
];

await loadDotEnv(envPath);

const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!spreadsheetId || !serviceAccountEmail || !privateKey) {
  throw new Error("Google Sheets environment variables are missing.");
}

const accessToken = await getAccessToken({ serviceAccountEmail, privateKey });
await ensureSheet({ spreadsheetId, accessToken, sheetName });
await replaceRows({ spreadsheetId, accessToken, sheetName, rows });

console.log(
  JSON.stringify(
    {
      sheet_name: sheetName,
      vehicle_yn_deleted: true,
      vehicle_id_kept: true,
      header_count: headers.length,
      headers,
      team_row_count: rows.length,
      vehicle_id_values_written: "blank",
      vehicle_id_values_logged: false,
    },
    null,
    2
  )
);

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
  const range = `'${sheetName}'!A:K`;
  const clear = await fetch(
    `${sheetsBaseUrl}/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
    { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!clear.ok) throw new Error(`Sheet clear failed: ${clear.status}`);

  const updateRange = `'${sheetName}'!A1:K${rows.length + 1}`;
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
