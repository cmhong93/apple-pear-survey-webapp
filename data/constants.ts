import type { SampleStatus } from '@/types/sample'

export const MVP_SURVEYORS = [
  { id: 'S01', label: 'Surveyor S01' },
  { id: 'S02', label: 'Surveyor S02' },
  { id: 'S03', label: 'Surveyor S03' },
  { id: 'S04', label: 'Surveyor S04' },
  { id: 'S05', label: 'Surveyor S05' },
  { id: 'S06', label: 'Surveyor S06' },
  { id: 'S07', label: 'Surveyor S07' },
  { id: 'S08', label: 'Surveyor S08' },
] as const

export const ADMIN_ROLE = 'admin'

export const STATUS_LABELS: Record<SampleStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  submitted: 'Submitted',
  qa_issue: 'QA issue',
  approved: 'Approved',
  rejected: 'Rejected',
}

export const REQUIRED_PHOTO_TYPES = ['plot', 'tree1', 'tree2', 'tree3', 'mygps660_screen'] as const
