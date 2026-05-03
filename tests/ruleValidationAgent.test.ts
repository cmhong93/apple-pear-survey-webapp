import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { runRuleValidationAgent } from '../agents/ruleValidationAgent.ts'
import type { MediaArtifact, PhotoType } from '../types/media.ts'
import type { SurveyAnswer, SurveySubmission } from '../types/submission.ts'

const requiredPhotoTypes: PhotoType[] = ['plot_photo', 'tree1_photo', 'tree2_photo', 'tree3_photo', 'mygps660_screen']

function answer(fieldId: string, fieldLabel: string, value: SurveyAnswer['value'], fieldType = 'text'): SurveyAnswer {
  return {
    fieldId,
    fieldLabel,
    value,
    fieldType,
  }
}

function media(photoType: PhotoType): MediaArtifact {
  return {
    id: `media-${photoType}`,
    sampleId: 'TEST-S01-001',
    photoType,
    originalFileName: `${photoType}.jpg`,
    mimeType: 'image/jpeg',
    sizeBytes: 1234,
    capturedAt: '2026-05-04T00:00:00.000Z',
    originalDriveFileId: `drive-${photoType}`,
    gpsCrossCheckStatus: photoType === 'mygps660_screen' ? 'matched' : 'not_applicable',
    manualMyGps660Coordinate:
      photoType === 'mygps660_screen'
        ? {
            lat: 36.123456,
            lng: 127.123456,
          }
        : undefined,
  }
}

function submission(answers: SurveyAnswer[]): Partial<SurveySubmission> {
  return {
    id: 'sub-test',
    sampleId: 'TEST-S01-001',
    surveyorId: 'S01',
    templateId: 'farm-basic-info-2026',
    status: 'submitted',
    answers,
    media: requiredPhotoTypes.map(media),
    appGps: {
      latitude: 36.123456,
      longitude: 127.123456,
      accuracyMeters: 8,
    },
    myGps660Coordinate: {
      latitude: 36.123456,
      longitude: 127.123456,
    },
    createdAt: '2026-05-04T00:00:00.000Z',
    updatedAt: '2026-05-04T00:00:00.000Z',
  }
}

function codes(result: ReturnType<typeof runRuleValidationAgent>) {
  return {
    hardErrors: result.hardErrors.map((item) => item.code),
    warnings: result.warnings.map((item) => item.code),
  }
}

describe('RuleValidationAgent 수형/특이사항 회귀 테스트', () => {
  it('수형 기타 선택 후 설명이 없으면 제출을 차단한다', () => {
    const result = runRuleValidationAgent(
      submission([
        answer('training_system_apple', '재배 수형', '기타', 'select'),
        answer('base_special_note', '특이사항', '특이사항 없음', 'textarea'),
      ]),
    )

    assert.equal(result.canSubmit, false)
    assert.ok(codes(result).hardErrors.includes('missing_training_system_other_detail'))
  })

  it('수형 확인불가 선택 후 사유가 없으면 제출을 차단한다', () => {
    const result = runRuleValidationAgent(
      submission([
        answer('training_system_pear', '재배 수형', '확인불가', 'select'),
        answer('base_special_note', '특이사항', '특이사항 없음', 'textarea'),
      ]),
    )

    assert.equal(result.canSubmit, false)
    assert.ok(codes(result).hardErrors.includes('missing_training_system_unknown_reason_pear'))
  })

  it('특이사항에 의미 없는 단독 입력을 넣으면 제출을 차단한다', () => {
    const result = runRuleValidationAgent(
      submission([
        answer('training_system_apple', '재배 수형', '세장방추형', 'select'),
        answer('base_special_note', '특이사항', '.', 'textarea'),
      ]),
    )

    assert.equal(result.canSubmit, false)
    assert.ok(codes(result).hardErrors.includes('meaningless_special_note_base_special_note'))
  })

  it('특이사항에 개인정보성 패턴이 있으면 제출을 차단한다', () => {
    const result = runRuleValidationAgent(
      submission([
        answer('training_system_apple', '재배 수형', '세장방추형', 'select'),
        answer('base_special_note', '특이사항', '주민등록번호 123456-1234567 확인됨', 'textarea'),
      ]),
    )

    assert.equal(result.canSubmit, false)
    assert.ok(codes(result).hardErrors.includes('pii_in_special_note_base_special_note'))
  })

  it('병해충 많음 선택 후 사유가 없으면 제출을 차단한다', () => {
    const result = runRuleValidationAgent(
      submission([
        answer('training_system_apple', '재배 수형', '세장방추형', 'select'),
        answer('growth_6_pest_incidence', '생리장해·병해충 발생 정도', '많음', 'select'),
      ]),
    )

    assert.equal(result.canSubmit, false)
    assert.ok(codes(result).hardErrors.includes('missing_abnormal_reason'))
  })

  it('일부 수확 O 선택 후 수확량이 없으면 제출을 차단한다', () => {
    const result = runRuleValidationAgent(
      submission([
        answer('partial_harvest_status', '일부 수확 여부', 'O', 'select'),
        answer('base_special_note', '특이사항', '조사 전 일부 수확 확인. 농가 진술 기준으로 확인함.', 'textarea'),
      ]),
    )

    assert.equal(result.canSubmit, false)
    assert.ok(codes(result).hardErrors.includes('missing_partial_harvest_amount'))
  })

  it('과수화상병 의심 입력은 관리자 보고 warning을 만든다', () => {
    const result = runRuleValidationAgent(
      submission([
        answer('training_system_apple', '재배 수형', '세장방추형', 'select'),
        answer('base_special_note', '특이사항', '과수화상병 의심 증상 일부 관찰. 관리자 확인 필요.', 'textarea'),
      ]),
    )

    assert.equal(result.canSubmit, true)
    assert.ok(codes(result).warnings.includes('fire_blight_admin_report_base_special_note'))
  })

  it('필수 GPS와 사진 증빙이 있고 수형/특이사항이 정상인 경우 제출 가능하다', () => {
    const result = runRuleValidationAgent(
      submission([
        answer('training_system_apple', '재배 수형', '세장방추형', 'select'),
        answer('base_special_note', '특이사항', '특이사항 없음', 'textarea'),
      ]),
    )

    assert.equal(result.canSubmit, true)
    assert.deepEqual(result.hardErrors, [])
  })
})
