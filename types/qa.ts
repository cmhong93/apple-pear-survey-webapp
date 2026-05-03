export type QaSeverity = 'info' | 'warning' | 'error'

export type QaIssueStatus = 'open' | 'resolved' | 'waived'

export interface QaFinding {
  code: string
  message: string
  severity: QaSeverity
  evidenceIds?: string[]
}

export interface QaIssue {
  id: string
  sampleId: string
  submissionId?: string
  title: string
  messageKo: string
  severity: QaSeverity
  status: QaIssueStatus
  createdAt: string
}

export interface QaRunResult {
  submissionId?: string
  findings: QaFinding[]
  issues: QaIssue[]
  assistantSummary: string
  blocked: boolean
}
