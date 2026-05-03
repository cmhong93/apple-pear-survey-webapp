import { runEvidenceMatchingAgent } from '@/agents/evidenceMatchingAgent'
import { runGeoEvidenceAgent } from '@/agents/geoEvidenceAgent'
import { runIssueGenerationAgent } from '@/agents/issueGenerationAgent'
import { runRuleValidationAgent } from '@/agents/ruleValidationAgent'
import { runVisionQaAgent } from '@/agents/visionQaAgent'
import type { QaRunResult } from '@/types/qa'
import type { Sample } from '@/types/sample'
import type { SurveySubmission } from '@/types/submission'

interface RunPreSubmitQaOptions {
  sample?: Sample
  submission: SurveySubmission
}

export async function runPreSubmitQa({ sample, submission }: RunPreSubmitQaOptions): Promise<QaRunResult> {
  const ruleFindings = runRuleValidationAgent(submission)
  const geoFindings = sample ? runGeoEvidenceAgent(sample, submission) : []
  const visionFindings = await runVisionQaAgent(submission.media)
  const findings = runEvidenceMatchingAgent([ruleFindings, geoFindings, visionFindings])
  const issues = runIssueGenerationAgent(submission.sampleId, findings).map((issue) => ({
    ...issue,
    submissionId: submission.id,
  }))
  const blocked = findings.some((finding) => finding.severity === 'error')

  return {
    submissionId: submission.id,
    findings,
    issues,
    blocked,
    assistantSummary: blocked
      ? `제출 전 검증에서 차단 항목 ${findings.filter((finding) => finding.severity === 'error').length}건이 발견되었습니다.`
      : `제출 전 검증이 완료되었습니다. 확인 항목 ${findings.length}건.`,
  }
}
