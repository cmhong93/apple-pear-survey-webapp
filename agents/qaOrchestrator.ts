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
  const ruleResult = runRuleValidationAgent(submission)
  const geoFindings = sample ? runGeoEvidenceAgent(sample, submission) : []
  const visionFindings = await runVisionQaAgent(submission.media)
  const warnings = runEvidenceMatchingAgent([ruleResult.warnings, geoFindings, visionFindings]).filter(
    (finding) => finding.severity !== 'info',
  )
  const findings = runEvidenceMatchingAgent([ruleResult.hardErrors, warnings])
  const issues = runIssueGenerationAgent(submission.sampleId, warnings).map((issue) => ({
    ...issue,
    submissionId: submission.id,
  }))

  return {
    submissionId: submission.id,
    findings,
    hardErrors: ruleResult.hardErrors,
    warnings,
    canSubmit: ruleResult.canSubmit,
    issues,
    blocked: !ruleResult.canSubmit,
    assistantSummary: ruleResult.canSubmit
      ? `제출 전 검증이 완료되었습니다. 확인 필요 항목 ${warnings.length}건`
      : `제출 전 검증에서 차단 항목 ${ruleResult.hardErrors.length}건이 발견되었습니다.`,
  }
}
