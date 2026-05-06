import { createSign, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
const googleTokenUrl = "https://oauth2.googleapis.com/token";
const sheetsBaseUrl = "https://sheets.googleapis.com/v4/spreadsheets";
const targetSheetName = process.argv[2];

if (!targetSheetName) {
  throw new Error("Target sheet name is required.");
}

await loadDotEnv(envPath);

const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!spreadsheetId || !serviceAccountEmail || !privateKey) {
  throw new Error("Google Sheets environment variables are missing.");
}

const accessToken = await getAccessToken({ serviceAccountEmail, privateKey });
const metadata = await readSpreadsheetMetadata({ spreadsheetId, accessToken });
const sheets = metadata.sheets?.map((sheet) => sheet.properties) ?? [];
const target = sheets.find((sheet) => sheet.title === targetSheetName);

if (!target) {
  console.log(
    JSON.stringify(
      {
        deleted: false,
        reason: "sheet_not_found",
        target_sheet: targetSheetName,
        sheet_count: sheets.length,
        sheet_names: sheets.map((sheet) => sheet.title),
      },
      null,
      2
    )
  );
  process.exit(0);
}

if (sheets.length <= 1) {
  throw new Error("Cannot delete the only sheet in the spreadsheet.");
}

const response = await fetch(`${sheetsBaseUrl}/${spreadsheetId}:batchUpdate`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    requests: [{ deleteSheet: { sheetId: target.sheetId } }],
  }),
});

if (!response.ok) {
  throw new Error(`Sheet delete failed: ${response.status}`);
}

const after = await readSpreadsheetMetadata({ spreadsheetId, accessToken });
const afterSheets = after.sheets?.map((sheet) => sheet.properties?.title) ?? [];

console.log(
  JSON.stringify(
    {
      deleted: true,
      deleted_sheet: targetSheetName,
      remaining_sheet_count: afterSheets.length,
      remaining_sheet_names: afterSheets,
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

async function readSpreadsheetMetadata({ spreadsheetId, accessToken }) {
  const response = await fetch(`${sheetsBaseUrl}/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Sheet metadata failed: ${response.status}`);
  return response.json();
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
