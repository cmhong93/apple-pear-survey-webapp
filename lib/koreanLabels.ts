import type { PhotoType } from '@/types/media'
import type { SampleStatus } from '@/types/sample'

export const STATUS_LABELS_KO: Record<SampleStatus, string> = {
  pending: '조사대기',
  draft: '임시저장',
  submitted: '제출완료',
  qa_required: '보완필요',
  approved: '승인완료',
  rejected: '반려',
  in_progress: '임시저장',
  qa_issue: '보완필요',
}

export const PHOTO_TYPE_LABELS_KO: Record<PhotoType, string> = {
  plot_photo: '필지 전경 사진',
  tree1_photo: '조사목 1번 사진',
  tree2_photo: '조사목 2번 사진',
  tree3_photo: '조사목 3번 사진',
  mygps660_screen: 'MyGPS660 화면 사진',
  damage_photo: '피해 사진',
  paper_form_photo: '종이조사표 촬영본',
}

export function statusLabelKo(status?: string) {
  if (!status) return '조사대기'
  return STATUS_LABELS_KO[status as SampleStatus] ?? status
}

export function photoTypeLabelKo(photoType: PhotoType) {
  return PHOTO_TYPE_LABELS_KO[photoType] ?? photoType
}

export const MESSAGES_KO = {
  loginFailed: '로그인에 실패했습니다.',
  surveyorSessionRequired: '조사원 로그인이 필요합니다.',
  adminSessionRequired: '관리자 로그인이 필요합니다.',
  sampleIdRequired: '표본 ID가 필요합니다.',
  submitSaved: '제출이 저장되었습니다.',
  submitFailed: '제출 저장에 실패했습니다.',
  uploadFailed: '사진 업로드에 실패했습니다.',
  requiredMissing: '필수값이 입력되지 않았습니다.',
  sheetsNotReady: '구글 시트 연결이 준비되지 않았습니다.',
}
