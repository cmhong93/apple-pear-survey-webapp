import { distanceMeters } from '@/lib/geo'
import type { QaFinding } from '@/types/qa'
import type { Sample } from '@/types/sample'
import type { SurveySubmission } from '@/types/submission'

export function runGeoEvidenceAgent(sample: Sample, submission: Partial<SurveySubmission>): QaFinding[] {
  const findings: QaFinding[] = []

  if (sample.expectedCoordinate && submission.appGps) {
    const distance = distanceMeters(sample.expectedCoordinate, submission.appGps)
    if (distance > 300) {
      findings.push({
        code: 'app_gps_far_from_sample',
        message: `App GPS is ${Math.round(distance)}m from the sample coordinate.`,
        severity: 'warning',
      })
    }
  }

  if (submission.appGps && submission.myGps660Coordinate) {
    const distance = distanceMeters(submission.appGps, submission.myGps660Coordinate)
    if (distance > 100) {
      findings.push({
        code: 'gps_sources_mismatch',
        message: `App GPS and MyGPS660 differ by ${Math.round(distance)}m.`,
        severity: 'warning',
      })
    }
  }

  return findings
}
