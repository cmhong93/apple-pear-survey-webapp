import { NextResponse } from 'next/server'
import { runEvidenceMatchingAgent } from '@/agents/evidenceMatchingAgent'
import { runGeoEvidenceAgent } from '@/agents/geoEvidenceAgent'
import { runIssueGenerationAgent } from '@/agents/issueGenerationAgent'
import { runRuleValidationAgent } from '@/agents/ruleValidationAgent'
import { runVisionQaAgent } from '@/agents/visionQaAgent'
import { getSampleById } from '@/data/mockSamples'
import type { SurveySubmission } from '@/types/submission'

export async function POST(request: Request) {
  const submission = (await request.json()) as Partial<SurveySubmission>
  const sample = submission.sampleId ? getSampleById(submission.sampleId) : undefined

  const ruleFindings = runRuleValidationAgent(submission)
  const geoFindings = sample ? runGeoEvidenceAgent(sample, submission) : []
  const visionFindings = await runVisionQaAgent(submission.media)
  const findings = runEvidenceMatchingAgent([ruleFindings, geoFindings, visionFindings])
  const issues = runIssueGenerationAgent(submission.sampleId ?? 'unknown-sample', findings)

  return NextResponse.json({
    submissionId: submission.id,
    findings,
    issues,
    assistantSummary: `${findings.length} MVP QA findings generated.`,
  })
}
