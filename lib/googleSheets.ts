import 'server-only'

import { google, sheets_v4 } from 'googleapis'
import { mockSamples } from '@/data/mockSamples'
import type { MediaArtifact } from '@/types/media'
import type { QaIssue } from '@/types/qa'
import type { Coordinate, Sample, SampleStatus } from '@/types/sample'
import type { SurveyAnswer, SurveySubmission } from '@/types/submission'

const SAMPLE_MASTER_SHEET = 'sample_master'
const SURVEY_SUBMISSIONS_SHEET = 'survey_submissions'
const SURVEY_ANSWERS_SHEET = 'survey_answers'
const GPS_LOG_SHEET = 'gps_log'
const MEDIA_FILES_SHEET = 'media_files'
const QA_ISSUES_SHEET = 'qa_issues'

export class GoogleSheetsConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GoogleSheetsConfigurationError'
  }
}

type SheetRow = Record<string, string>

function isLocalDevelopment() {
  return process.env.NODE_ENV !== 'production'
}

function getSpreadsheetId() {
  return process.env.GOOGLE_SHEET_ID || process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ''
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
    throw new GoogleSheetsConfigurationError('GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 is not valid base64 JSON.')
  }
}

function normalizePrivateKey(value: string) {
  return value
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n')
}

export function isGoogleSheetsConfigured() {
  return Boolean(
    getSpreadsheetId() &&
      (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 ||
        (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)),
  )
}

function requireSheetsConfiguration() {
  const spreadsheetId = getSpreadsheetId()
  const credentials = getServiceAccountJson()

  if (!spreadsheetId || !credentials) {
    if (isLocalDevelopment()) return null
    throw new GoogleSheetsConfigurationError(
      'Google Sheets is not configured. Set GOOGLE_SHEET_ID plus GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, or GOOGLE_SERVICE_ACCOUNT_EMAIL plus GOOGLE_PRIVATE_KEY.',
    )
  }

  return { spreadsheetId, credentials }
}

async function getSheetsClient() {
  const config = requireSheetsConfiguration()
  if (!config) return null

  const auth = new google.auth.JWT({
    email: config.credentials.client_email,
    key: config.credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  return {
    spreadsheetId: config.spreadsheetId,
    sheets: google.sheets({ version: 'v4', auth }),
  }
}

function value(row: SheetRow, key: string) {
  return (row[key] ?? '').trim()
}

function firstValue(row: SheetRow, keys: string[]) {
  for (const key of keys) {
    const current = value(row, key)
    if (current) return current
  }
  return ''
}

function parseCoordinate(lat?: string, lng?: string): Coordinate | undefined {
  const latitude = Number(lat)
  const longitude = Number(lng)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined
  return { latitude, longitude }
}

function mapSheetRows(values?: sheets_v4.Schema$ValueRange['values']): SheetRow[] {
  const [headers = [], ...rows] = values ?? []
  const keys = headers.map((header) => String(header).trim())

  return rows
    .filter((row) => row.some((cell) => String(cell ?? '').trim().length > 0))
    .map((row) =>
      Object.fromEntries(keys.map((key, index) => [key, String(row[index] ?? '').trim()])),
    )
}

function normalizeCrop(raw: string) {
  if (raw.includes('배') || raw.toLowerCase() === 'pear') return 'pear'
  return 'apple'
}

function rowToSample(row: SheetRow): Sample {
  const sampleId = firstValue(row, ['sample_id', 'ID'])
  const rawCrop = firstValue(row, ['crop', '품목'])
  const fieldAddress = firstValue(row, ['field_address', '필지주소'])
  const homeAddress = firstValue(row, ['home_address', '자택주소'])
  const mobilePhone = firstValue(row, ['mobile_phone', '휴대전화'])
  const phone = firstValue(row, ['phone', '전화번호'])

  return {
    id: sampleId,
    crop: normalizeCrop(rawCrop),
    cropLabel: rawCrop || '사과',
    variety: firstValue(row, ['variety', '품종']) || '-',
    farmCode: sampleId,
    farmerName: firstValue(row, ['farmer_name', '이름']),
    phone,
    mobilePhone,
    province: firstValue(row, ['province', '시도']) || 'Chungnam',
    city: firstValue(row, ['city', '시군구']),
    town: firstValue(row, ['town', '읍면동']),
    homeAddress,
    fieldAddress,
    originalFile: firstValue(row, ['original_file', '원본파일']),
    pnu: firstValue(row, ['pnu', '팜맵 PNU']),
    notes: firstValue(row, ['notes', '특이사항']),
    surveyMonth: firstValue(row, ['survey_month', '조사월']) || '202606',
    assignedSurveyorId: firstValue(row, ['surveyor_id', '조사원']).toUpperCase(),
    status: (value(row, 'status') || 'pending') as SampleStatus,
    expectedCoordinate: parseCoordinate(
      firstValue(row, ['field_lat', '필지위도']),
      firstValue(row, ['field_lng', '필지경도']),
    ),
  }
}

async function appendRows(sheetName: string, rows: Array<Array<string | number | boolean | null>>) {
  const client = await getSheetsClient()
  if (!client) {
    return { configured: false, updatedRows: rows.length }
  }

  const result = await client.sheets.spreadsheets.values.append({
    spreadsheetId: client.spreadsheetId,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: rows,
    },
  })

  return {
    configured: true,
    updatedRows: result.data.updates?.updatedRows ?? rows.length,
  }
}

export async function readSampleMaster(): Promise<Sample[]> {
  const client = await getSheetsClient()
  if (!client) return mockSamples

  const result = await client.sheets.spreadsheets.values.get({
    spreadsheetId: client.spreadsheetId,
    range: `${SAMPLE_MASTER_SHEET}!A:Z`,
  })

  return mapSheetRows(result.data.values)
    .map(rowToSample)
    .filter((sample) => sample.id)
}

export async function readSurveySubmissions() {
  const client = await getSheetsClient()
  if (!client) return []

  const result = await client.sheets.spreadsheets.values.get({
    spreadsheetId: client.spreadsheetId,
    range: `${SURVEY_SUBMISSIONS_SHEET}!A:Z`,
  })

  return mapSheetRows(result.data.values)
}

export async function readSurveyAnswers() {
  const client = await getSheetsClient()
  if (!client) return []

  const result = await client.sheets.spreadsheets.values.get({
    spreadsheetId: client.spreadsheetId,
    range: `${SURVEY_ANSWERS_SHEET}!A:Z`,
  })

  return mapSheetRows(result.data.values)
}

export async function appendSurveySubmission(submission: SurveySubmission) {
  return appendRows(SURVEY_SUBMISSIONS_SHEET, [
    [
      submission.id,
      submission.sampleId,
      submission.surveyorId,
      submission.templateId,
      submission.surveyType ?? '',
      submission.status,
      submission.submittedAt ?? '',
      submission.createdAt,
      submission.updatedAt,
    ],
  ])
}

export async function appendSurveyAnswers(submissionId: string, answers: SurveyAnswer[]) {
  return appendRows(
    SURVEY_ANSWERS_SHEET,
    answers.map((answer) => [
      submissionId,
      answer.fieldId,
      answer.fieldLabel,
      Array.isArray(answer.value)
        ? answer.value.join(', ')
        : typeof answer.value === 'boolean'
          ? String(answer.value)
          : answer.value,
    ]),
  )
}

export async function appendGpsLog(submission: SurveySubmission) {
  return appendRows(GPS_LOG_SHEET, [
    [
      submission.id,
      submission.sampleId,
      submission.surveyorId,
      submission.appGps?.latitude ?? '',
      submission.appGps?.longitude ?? '',
      submission.appGps?.accuracyMeters ?? '',
      submission.myGps660Coordinate?.latitude ?? '',
      submission.myGps660Coordinate?.longitude ?? '',
      submission.submittedAt ?? '',
    ],
  ])
}

export async function appendMediaFiles(media: MediaArtifact[]) {
  return appendRows(
    MEDIA_FILES_SHEET,
    media.map((item) => [
      item.id,
      item.submissionId ?? '',
      item.sampleId,
      item.photoType,
      item.originalFileName,
      item.mimeType,
      item.sizeBytes,
      item.capturedAt,
      item.originalDriveFileId ?? '',
      item.watermarkedDriveFileId ?? '',
    ]),
  )
}

export async function appendQaIssues(issues: QaIssue[]) {
  return appendRows(
    QA_ISSUES_SHEET,
    issues.map((issue) => [
      issue.id,
      issue.sampleId,
      issue.submissionId ?? '',
      issue.title,
      issue.messageKo,
      issue.severity,
      issue.status,
      issue.createdAt,
    ]),
  )
}

export function isSheetsConfigError(error: unknown) {
  return error instanceof GoogleSheetsConfigurationError
}
