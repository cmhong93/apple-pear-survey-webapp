import 'server-only'

import { Readable } from 'node:stream'
import { google } from 'googleapis'

export class GoogleDriveConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GoogleDriveConfigurationError'
  }
}

function isLocalDevelopment() {
  return process.env.NODE_ENV !== 'production'
}

function getDriveFolderId() {
  return envValue('GOOGLE_DRIVE_ROOT_FOLDER_ID') || envValue('GOOGLE_DRIVE_FOLDER_ID')
}

function envValue(name: string) {
  return (process.env[name] ?? '').trim().replace(/^["']|["']$/g, '')
}

function getOAuthCredentials() {
  const clientId = envValue('GOOGLE_OAUTH_CLIENT_ID')
  const clientSecret = envValue('GOOGLE_OAUTH_CLIENT_SECRET')
  const refreshToken = envValue('GOOGLE_OAUTH_REFRESH_TOKEN')

  if (!clientId || !clientSecret || !refreshToken) return null

  return { clientId, clientSecret, refreshToken }
}

function getServiceAccountJson() {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64
  if (!encoded) {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      return {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
      }
    }
    return null
  }

  try {
    return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as {
      client_email: string
      private_key: string
    }
  } catch {
    throw new GoogleDriveConfigurationError('GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 is not valid base64 JSON.')
  }
}

function normalizePrivateKey(value: string) {
  return value
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n')
}

export function isGoogleDriveConfigured() {
  return Boolean(
    getDriveFolderId() &&
      (getOAuthCredentials() ||
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 ||
        (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)),
  )
}

async function getDriveClient() {
  const folderId = getDriveFolderId()
  const oauthCredentials = getOAuthCredentials()
  if (folderId && oauthCredentials) {
    const auth = new google.auth.OAuth2(oauthCredentials.clientId, oauthCredentials.clientSecret)
    auth.setCredentials({ refresh_token: oauthCredentials.refreshToken })

    return {
      folderId,
      drive: google.drive({ version: 'v3', auth }),
    }
  }

  const credentials = getServiceAccountJson()

  if (!folderId || !credentials) {
    if (isLocalDevelopment()) return null
    throw new GoogleDriveConfigurationError(
      'Google Drive is not configured. Set GOOGLE_DRIVE_ROOT_FOLDER_ID plus Google OAuth credentials, GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, or GOOGLE_SERVICE_ACCOUNT_EMAIL plus GOOGLE_PRIVATE_KEY.',
    )
  }

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })

  return {
    folderId,
    drive: google.drive({ version: 'v3', auth }),
  }
}

export async function uploadOriginalPhoto(file: File, name: string) {
  const buffer = Buffer.from(await file.arrayBuffer())
  return uploadOriginalPhotoBuffer(buffer, name, file.type || 'application/octet-stream', file.size)
}

export async function uploadOriginalPhotoBuffer(
  buffer: Buffer,
  name: string,
  mimeType = 'application/octet-stream',
  sizeBytes = buffer.byteLength,
) {
  const client = await getDriveClient()
  if (!client) {
    throw new GoogleDriveConfigurationError('Drive not configured. Photo upload is not ready.')
  }

  const result = await client.drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name,
      parents: [client.folderId],
      mimeType,
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: 'id,name,mimeType,size',
  })

  if (!result.data.id) {
    throw new Error('Google Drive upload completed without a file id.')
  }

  return {
    fileId: result.data.id,
    name: result.data.name ?? name,
    mimeType: result.data.mimeType ?? mimeType,
    size: Number(result.data.size ?? sizeBytes),
  }
}

export function isDriveConfigError(error: unknown) {
  return error instanceof GoogleDriveConfigurationError
}
