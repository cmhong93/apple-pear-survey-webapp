import "server-only";
import { createSign, randomUUID } from "node:crypto";

const googleTokenUrl = "https://oauth2.googleapis.com/token";
const driveBaseUrl = "https://www.googleapis.com/drive/v3";
const driveUploadUrl = "https://www.googleapis.com/upload/drive/v3/files";
const driveScope = "https://www.googleapis.com/auth/drive";

let cachedDriveAccessToken:
  | {
      token: string;
      expiresAt: number;
    }
  | undefined;

export function getGoogleDriveConfig() {
  const serviceAccountJson = parseServiceAccountJson();

  return {
    authMode: (process.env.GOOGLE_DRIVE_AUTH_MODE ?? "").toLowerCase(),
    rootFolderId:
      process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ||
      process.env.GOOGLE_DRIVE_FOLDER_ID ||
      "",
    oauthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
    oauthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
    oauthRefreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN ?? "",
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

export async function ensureDriveFolderPath({
  rootFolderId,
  segments,
}: {
  rootFolderId: string;
  segments: string[];
}) {
  let parentId = rootFolderId;

  for (const segment of segments.map(sanitizeDriveName).filter(Boolean)) {
    const existing = await findFolder({ parentId, name: segment });
    parentId = existing ?? (await createFolder({ parentId, name: segment }));
  }

  return parentId;
}

export async function uploadPdfToDrive({
  folderId,
  filename,
  data,
}: {
  folderId: string;
  filename: string;
  data: Uint8Array;
}) {
  const accessToken = await getDriveAccessToken();
  const boundary = `survey_pdf_${randomUUID()}`;
  const metadata = {
    name: sanitizeDriveName(filename),
    mimeType: "application/pdf",
    parents: [folderId],
  };
  const delimiter = `--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;
  const body = Buffer.concat([
    Buffer.from(
      `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
        metadata
      )}\r\n${delimiter}Content-Type: application/pdf\r\n\r\n`,
      "utf8"
    ),
    Buffer.from(data),
    Buffer.from(closeDelimiter, "utf8"),
  ]);

  const response = await fetch(
    `${driveUploadUrl}?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink,name`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      `Google Drive upload failed with ${response.status}${
        message ? `: ${message.slice(0, 300)}` : ""
      }`
    );
  }

  return (await response.json()) as {
    id: string;
    name: string;
    webViewLink?: string;
  };
}

export async function uploadFileToDrive({
  folderId,
  filename,
  data,
  mimeType,
}: {
  folderId: string;
  filename: string;
  data: Uint8Array;
  mimeType: string;
}) {
  const accessToken = await getDriveAccessToken();
  const boundary = `survey_file_${randomUUID()}`;
  const metadata = {
    name: sanitizeDriveName(filename),
    mimeType,
    parents: [folderId],
  };
  const delimiter = `--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;
  const body = Buffer.concat([
    Buffer.from(
      `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
        metadata
      )}\r\n${delimiter}Content-Type: ${mimeType}\r\n\r\n`,
      "utf8"
    ),
    Buffer.from(data),
    Buffer.from(closeDelimiter, "utf8"),
  ]);

  const response = await fetch(
    `${driveUploadUrl}?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink,name,size,mimeType`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      `Google Drive upload failed with ${response.status}${
        message ? `: ${message.slice(0, 300)}` : ""
      }`
    );
  }

  return (await response.json()) as {
    id: string;
    name: string;
    size?: string;
    mimeType?: string;
    webViewLink?: string;
  };
}

async function findFolder({ parentId, name }: { parentId: string; name: string }) {
  const accessToken = await getDriveAccessToken();
  const query = [
    "mimeType='application/vnd.google-apps.folder'",
    "trashed=false",
    `'${escapeDriveQuery(parentId)}' in parents`,
    `name='${escapeDriveQuery(name)}'`,
  ].join(" and ");
  const url = new URL(`${driveBaseUrl}/files`);
  url.searchParams.set("q", query);
  url.searchParams.set("fields", "files(id,name)");
  url.searchParams.set("pageSize", "1");
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("includeItemsFromAllDrives", "true");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Google Drive folder lookup failed with ${response.status}.`);
  }

  const payload = (await response.json()) as { files?: Array<{ id: string }> };
  return payload.files?.[0]?.id;
}

async function createFolder({ parentId, name }: { parentId: string; name: string }) {
  const accessToken = await getDriveAccessToken();
  const response = await fetch(
    `${driveBaseUrl}/files?supportsAllDrives=true&fields=id,name`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Google Drive folder create failed with ${response.status}.`);
  }

  return ((await response.json()) as { id: string }).id;
}

async function getDriveAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedDriveAccessToken && cachedDriveAccessToken.expiresAt - 60 > now) {
    return cachedDriveAccessToken.token;
  }

  const config = getGoogleDriveConfig();
  const hasOAuthCredentials =
    Boolean(config.oauthClientId) &&
    Boolean(config.oauthClientSecret) &&
    Boolean(config.oauthRefreshToken);

  if (config.authMode === "oauth" || hasOAuthCredentials) {
    if (!hasOAuthCredentials) {
      throw new Error("Google Drive OAuth credentials are not configured.");
    }

    return getOAuthDriveAccessToken({ now, config });
  }

  const { serviceAccountEmail, privateKey } = config;
  if (!serviceAccountEmail || !privateKey) {
    throw new Error("Google Drive service account is not configured.");
  }

  const assertion = createJwt({
    serviceAccountEmail,
    privateKey,
    now,
  });
  const response = await fetch(googleTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Drive token request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedDriveAccessToken = {
    token: payload.access_token,
    expiresAt: now + payload.expires_in,
  };
  return cachedDriveAccessToken.token;
}

async function getOAuthDriveAccessToken({
  now,
  config,
}: {
  now: number;
  config: ReturnType<typeof getGoogleDriveConfig>;
}) {
  const response = await fetch(googleTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.oauthClientId,
      client_secret: config.oauthClientSecret,
      refresh_token: config.oauthRefreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Google Drive OAuth token request failed with ${response.status}.`
    );
  }

  const payload = (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };
  cachedDriveAccessToken = {
    token: payload.access_token,
    expiresAt: now + (payload.expires_in ?? 3600),
  };
  return cachedDriveAccessToken.token;
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
    scope: driveScope,
    aud: googleTokenUrl,
    exp: now + 3600,
    iat: now,
    jti: randomUUID(),
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(
    JSON.stringify(claim)
  )}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(privateKey);
  return `${unsigned}.${base64Url(signature)}`;
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function escapeDriveQuery(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function sanitizeDriveName(value: string) {
  return value.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim();
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
