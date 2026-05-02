import type { QaFinding, QaIssue } from '@/types/qa'

export function runIssueGenerationAgent(sampleId: string, findings: QaFinding[]): QaIssue[] {
  return findings
    .filter((finding) => finding.severity !== 'info')
    .map((finding, index) => ({
      id: `${sampleId}-issue-${index + 1}`,
      sampleId,
      title: finding.code,
      messageKo: `확인 필요: ${finding.message}`,
      severity: finding.severity,
      status: 'open',
      createdAt: new Date().toISOString(),
    }))
}
