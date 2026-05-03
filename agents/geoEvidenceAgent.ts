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
        message: `앱 GPS가 표본 좌표에서 ${Math.round(distance)}m 떨어져 있습니다.`,
        severity: 'warning',
      })
    }
  }

  if (submission.appGps && submission.myGps660Coordinate) {
    const distance = distanceMeters(submission.appGps, submission.myGps660Coordinate)
    if (distance > 100) {
      findings.push({
        code: 'gps_sources_mismatch',
        message: `앱 GPS와 MyGPS660 좌표가 ${Math.round(distance)}m 차이납니다.`,
        severity: 'warning',
      })
    }
  }

  return findings
}
