import "server-only";
import { createSign, randomUUID } from "node:crypto";

const googleTokenUrl = "https://oauth2.googleapis.com/token";
const sheetsBaseUrl = "https://sheets.googleapis.com/v4/spreadsheets";
const sheetsScope = "https://www.googleapis.com/auth/spreadsheets";

export type SheetAppendInput = {
  spreadsheetId: string;
  sheetName: string;
  headers: string[];
  rows: unknown[][];
};

export type SheetValueUpdate = {
  range: string;
  values: unknown[][];
};

let cachedAccessToken:
  | {
      token: string;
      expiresAt: number;
    }
  | undefined;

export function getGoogleSheetsConfig() {
  const serviceAccountJson = parseServiceAccountJson();

  return {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? "",
    serviceAccountEmail:
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ??
      serviceAccountJson?.client_email ??
      "",
    privateKey: (
      process.env.GOOGLE_PRIVATE_KEY ??
      serviceAccountJson?.private_key ??
      ""
    ).replace(/\\n/g, "\n"),
  };
}

export async function appendRowsToSheet({
  spreadsheetId,
  sheetName,
  headers,
  rows,
}: SheetAppendInput) {
  const accessToken = await getAccessToken();

  await ensureSheetWithHeaders({
    spreadsheetId,
    sheetName,
    headers,
    accessToken,
  });

  if (rows.length === 0) return;

  const range = `${quoteSheetName(sheetName)}!A:${columnName(headers.length)}`;
  const response = await fetch(
    `${sheetsBaseUrl}/${spreadsheetId}/values/${encodeURIComponent(
      range
    )}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        majorDimension: "ROWS",
        values: rows,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Google Sheets append failed with ${response.status}.`);
  }
}

export async function replaceSheetRows({
  spreadsheetId,
  sheetName,
  headers,
  rows,
}: SheetAppendInput) {
  const accessToken = await getAccessToken();

  await ensureSheetWithHeaders({
    spreadsheetId,
    sheetName,
    headers,
    accessToken,
  });

  const clearRange = `${quoteSheetName(sheetName)}!A:${columnName(
    headers.length
  )}`;
  const clearResponse = await fetch(
    `${sheetsBaseUrl}/${spreadsheetId}/values/${encodeURIComponent(
      clearRange
    )}:clear`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!clearResponse.ok) {
    throw new Error(`Google Sheets clear failed with ${clearResponse.status}.`);
  }

  const updateRange = `${quoteSheetName(sheetName)}!A1:${columnName(
    headers.length
  )}${rows.length + 1}`;
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
      body: JSON.stringify({
        majorDimension: "ROWS",
        values: [headers, ...rows],
      }),
    }
  );

  if (!updateResponse.ok) {
    throw new Error(`Google Sheets replace failed with ${updateResponse.status}.`);
  }
}

export async function readSheetValues({
  spreadsheetId,
  range,
}: {
  spreadsheetId: string;
  range: string;
}) {
  const accessToken = await getAccessToken();
  const response = await fetch(
    `${sheetsBaseUrl}/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(`Google Sheets read failed with ${response.status}.`);
  }

  const payload = (await response.json()) as { values?: string[][] };
  return payload.values ?? [];
}

export async function getSpreadsheetMetadata(spreadsheetId: string) {
  const accessToken = await getGoogleSheetsAccessToken();
  const response = await fetch(`${sheetsBaseUrl}/${spreadsheetId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Google Sheets metadata request failed with ${response.status}.`);
  }

  return (await response.json()) as {
    sheets?: Array<{
      properties?: {
        sheetId?: number;
        title?: string;
      };
    }>;
  };
}

export async function batchUpdateSpreadsheet({
  spreadsheetId,
  requests,
}: {
  spreadsheetId: string;
  requests: unknown[];
}) {
  if (requests.length === 0) return {};
  const accessToken = await getGoogleSheetsAccessToken();
  const response = await fetch(`${sheetsBaseUrl}/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    throw new Error(`Google Sheets batch update failed with ${response.status}.`);
  }

  return (await response.json()) as {
    replies?: Array<{
      duplicateSheet?: {
        properties?: {
          sheetId?: number;
          title?: string;
        };
      };
    }>;
  };
}

export async function batchUpdateSheetValues({
  spreadsheetId,
  updates,
}: {
  spreadsheetId: string;
  updates: SheetValueUpdate[];
}) {
  if (updates.length === 0) return;
  const accessToken = await getGoogleSheetsAccessToken();
  const response = await fetch(
    `${sheetsBaseUrl}/${spreadsheetId}/values:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: updates,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Google Sheets values batch update failed with ${response.status}.`);
  }
}

export async function exportSheetToPdf({
  spreadsheetId,
  sheetId,
}: {
  spreadsheetId: string;
  sheetId: number;
}) {
  const accessToken = await getGoogleSheetsAccessToken();
  const url = new URL(
    `https://docs.google.com/spreadsheets/d/${encodeURIComponent(
      spreadsheetId
    )}/export`
  );
  url.searchParams.set("format", "pdf");
  url.searchParams.set("gid", String(sheetId));
  url.searchParams.set("size", "A4");
  url.searchParams.set("portrait", "true");
  url.searchParams.set("fitw", "true");
  url.searchParams.set("sheetnames", "false");
  url.searchParams.set("printtitle", "false");
  url.searchParams.set("pagenumbers", "false");
  url.searchParams.set("gridlines", "false");
  url.searchParams.set("fzr", "false");
  url.searchParams.set("top_margin", "0.25");
  url.searchParams.set("bottom_margin", "0.25");
  url.searchParams.set("left_margin", "0.25");
  url.searchParams.set("right_margin", "0.25");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Google Sheets PDF export failed with ${response.status}.`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

async function ensureSheetWithHeaders({
  spreadsheetId,
  sheetName,
  headers,
  accessToken,
}: {
  spreadsheetId: string;
  sheetName: string;
  headers: string[];
  accessToken: string;
}) {
  const metadataResponse = await fetch(`${sheetsBaseUrl}/${spreadsheetId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!metadataResponse.ok) {
    throw new Error(
      `Google Sheets metadata request failed with ${metadataResponse.status}.`
    );
  }

  const metadata = (await metadataResponse.json()) as {
    sheets?: Array<{ properties?: { title?: string } }>;
  };
  const exists = metadata.sheets?.some(
    (sheet) => sheet.properties?.title === sheetName
  );

  if (!exists) {
    const addSheetResponse = await fetch(
      `${sheetsBaseUrl}/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [{ addSheet: { properties: { title: sheetName } } }],
        }),
      }
    );

    if (!addSheetResponse.ok) {
      throw new Error(
        `Google Sheets add sheet failed with ${addSheetResponse.status}.`
      );
    }
  }

  const headerRange = `${quoteSheetName(sheetName)}!A1:${columnName(
    headers.length
  )}1`;
  const headerValues = await readSheetValues({ spreadsheetId, range: headerRange });

  const currentHeaders = headerValues[0] ?? [];
  const hasMatchingHeaders =
    currentHeaders.length >= headers.length &&
    headers.every((header, index) => currentHeaders[index] === header);

  if (hasMatchingHeaders) return;

  const updateResponse = await fetch(
    `${sheetsBaseUrl}/${spreadsheetId}/values/${encodeURIComponent(
      headerRange
    )}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        majorDimension: "ROWS",
        values: [headers],
      }),
    }
  );

  if (!updateResponse.ok) {
    throw new Error(
      `Google Sheets header update failed with ${updateResponse.status}.`
    );
  }
}

export async function getGoogleSheetsAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt - 60 > now) {
    return cachedAccessToken.token;
  }

  const { serviceAccountEmail, privateKey } = getGoogleSheetsConfig();
  if (!serviceAccountEmail || !privateKey) {
    throw new Error("Google Sheets service account is not configured.");
  }

  const assertion = createJwt({
    serviceAccountEmail,
    privateKey,
    now,
  });
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const response = await fetch(googleTokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Google token request failed with ${response.status}.`);
  }

  const tokenPayload = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedAccessToken = {
    token: tokenPayload.access_token,
    expiresAt: now + tokenPayload.expires_in,
  };

  return cachedAccessToken.token;
}

async function getAccessToken() {
  return getGoogleSheetsAccessToken();
}

function createJwt({
  serviceAccountEmail,
  privateKey,
  now,
}: {
  serviceAccountEmail: string;
  privateKey: string;
  now: number;
}) {
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccountEmail,
    scope: sheetsScope,
    aud: googleTokenUrl,
    exp: now + 3600,
    iat: now,
    jti: randomUUID(),
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(
    JSON.stringify(claim)
  )}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(privateKey);

  return `${unsigned}.${base64Url(signature)}`;
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function quoteSheetName(sheetName: string) {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

function columnName(index: number) {
  let value = index;
  let result = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }

  return result;
}

function parseServiceAccountJson() {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  if (!encoded) return undefined;

  try {
    return JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as {
      client_email?: string;
      private_key?: string;
    };
  } catch {
    return undefined;
  }
}
