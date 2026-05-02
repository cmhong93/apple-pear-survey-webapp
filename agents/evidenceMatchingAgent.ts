import type { QaFinding } from '@/types/qa'

export function runEvidenceMatchingAgent(groups: QaFinding[][]): QaFinding[] {
  return groups.flat().sort((a, b) => {
    const rank = { error: 0, warning: 1, info: 2 }
    return rank[a.severity] - rank[b.severity]
  })
}
