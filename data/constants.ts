import type { SampleStatus } from '@/types/sample'

export const MVP_SURVEYORS = [
  { id: 'S01', label: '조사원 S01' },
  { id: 'S02', label: '조사원 S02' },
  { id: 'S03', label: '조사원 S03' },
  { id: 'S04', label: '조사원 S04' },
  { id: 'S05', label: '조사원 S05' },
  { id: 'S06', label: '조사원 S06' },
  { id: 'S07', label: '조사원 S07' },
  { id: 'S08', label: '조사원 S08' },
] as const

export const ADMIN_ROLE = 'admin'

export const STATUS_LABELS: Record<SampleStatus, string> = {
  pending: '조사대기',
  draft: '임시저장',
  submitted: '제출완료',
  qa_required: '보완필요',
  approved: '승인완료',
  rejected: '반려',
  in_progress: '임시저장',
  qa_issue: '보완필요',
}

export const REQUIRED_PHOTO_TYPES = [
  'plot_photo',
  'tree1_photo',
  'tree2_photo',
  'tree3_photo',
  'mygps660_screen',
] as const
