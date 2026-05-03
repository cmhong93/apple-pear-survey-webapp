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
  return process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID || ''
}

function getServiceAccountJson() {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64
  if (!encoded) {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      return {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
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

export function isGoogleDriveConfigured() {
  return Boolean(
    getDriveFolderId() &&
      (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 ||
        (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)),
  )
}

async function getDriveClient() {
  const folderId = getDriveFolderId()
  const credentials = getServiceAccountJson()

  if (!folderId || !credentials) {
    if (isLocalDevelopment()) return null
    throw new GoogleDriveConfigurationError(
      'Google Drive is not configured. Set GOOGLE_DRIVE_ROOT_FOLDER_ID plus GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, or GOOGLE_SERVICE_ACCOUNT_EMAIL plus GOOGLE_PRIVATE_KEY.',
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
  const client = await getDriveClient()
  if (!client) {
    throw new GoogleDriveConfigurationError('Drive not configured. Photo upload is not ready.')
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await client.drive.files.create({
    requestBody: {
      name,
      parents: [client.folderId],
      mimeType: file.type || 'application/octet-stream',
    },
    media: {
      mimeType: file.type || 'application/octet-stream',
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
    mimeType: result.data.mimeType ?? file.type,
    size: Number(result.data.size ?? file.size),
  }
}

export function isDriveConfigError(error: unknown) {
  return error instanceof GoogleDriveConfigurationError
}
