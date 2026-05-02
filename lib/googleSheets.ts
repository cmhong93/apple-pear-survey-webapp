import { mockSamples } from '@/data/mockSamples'
import type { QaIssue } from '@/types/qa'
import type { Sample } from '@/types/sample'
import type { SurveySubmission } from '@/types/submission'

export function isGoogleSheetsConfigured() {
  return Boolean(process.env.GOOGLE_SHEET_ID ?? process.env.GOOGLE_SHEETS_SPREADSHEET_ID)
}

export async function readSampleMaster(): Promise<Sample[]> {
  if (!isGoogleSheetsConfigured()) return mockSamples
  return mockSamples
}

export async function appendSurveySubmission(submission: SurveySubmission) {
  return {
    configured: isGoogleSheetsConfigured(),
    rowId: `mock-submission-${submission.id}`,
  }
}

export async function appendQaIssues(issues: QaIssue[]) {
  return {
    configured: isGoogleSheetsConfigured(),
    count: issues.length,
  }
}
