'use client'

import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { runRuleValidationAgent } from '@/agents/ruleValidationAgent'
import { REQUIRED_PHOTO_TYPES } from '@/data/constants'
import { photoTypeLabelKo } from '@/lib/koreanLabels'
import type { MediaArtifact, PhotoType } from '@/types/media'
import type { QaFinding } from '@/types/qa'
import type { Coordinate, Sample } from '@/types/sample'
import type { SurveyField, SurveyTemplate } from '@/types/survey'

interface SurveySubmissionFormProps {
  sample: Sample
  templates: SurveyTemplate[]
}

const quickNoteTemplates = [
  { label: '특이사항 없음', text: '특이사항 없음' },
  { label: '수형 혼재', text: '수형 혼재: [주 수형] [ ]%, [보조 수형] [ ]%. 조사목은 [ ] 수형 구역에 위치' },
  { label: '재식주수 실측', text: '농가가 재식주수를 정확히 알지 못해 현장 실측 기준으로 입력' },
  { label: '병해충 많음', text: '[병해충명] 발생이 전년 대비 많음. 피해 정도: [ ]. 주요 원인: [ ]' },
  { label: '생리장해 발생', text: '[일소/열과/낙과/과피얼룩] 발생. 발생 위치/면적: [ ]. 전년 대비: [ ]' },
  { label: '일부 수확', text: '조사 전 일부 수확 확인. 그루당 수확량: [ ]개. 착과수 조사에 반영' },
  { label: '측정 불가', text: '[반복 개체/원가지] 측정 불가. 사유: [ ]. 대체 여부: [ ]' },
  { label: '생산량 차이', text: '예상 생산량이 전년/평년 대비 [증가/감소]. 사유: [ ]' },
]

function shouldShowField(field: SurveyField, sample: Sample, template: SurveyTemplate, values: Record<string, string>) {
  if (!field.condition) return true
  const { target, equals, includes, fieldId } = field.condition
  const targetValue =
    target === 'crop'
      ? sample.crop
      : target === 'variety'
        ? sample.variety
        : target === 'surveyType'
          ? template.id
          : fieldId
            ? values[fieldId]
            : ''

  if (includes) return String(targetValue ?? '').includes(includes)
  if (equals !== undefined) return targetValue === equals
  return true
}

function initialValue(sample: Sample, fieldId: string) {
  const values: Record<string, string> = {
    sample_id_confirm: sample.id,
    farmer_name_confirm: sample.farmerName ?? '',
    contact_confirm: sample.mobilePhone || sample.phone || '',
    home_address_confirm: sample.homeAddress ?? '',
    field_address_confirm: sample.fieldAddress ?? '',
    variety_confirm: sample.variety,
    detailed_variety: sample.variety,
  }
  return values[fieldId] ?? ''
}

function groupBySection(fields: SurveyField[]) {
  return fields.reduce<Record<string, SurveyField[]>>((acc, field) => {
    const section = field.section || '조사 문항'
    acc[section] = [...(acc[section] ?? []), field]
    return acc
  }, {})
}

function parseCoordinateValue(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  if (!text) return undefined
  const numeric = Number(text)
  return Number.isFinite(numeric) ? numeric : undefined
}

function isNoteField(field: SurveyField) {
  return (
    field.type === 'textarea' &&
    (field.id.includes('note') ||
      field.id.includes('reason') ||
      field.id.includes('other') ||
      field.label.includes('특이사항') ||
      field.label.includes('사유') ||
      field.label.includes('기타'))
  )
}

export function SurveySubmissionForm({ sample, templates }: SurveySubmissionFormProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? '')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [appGps, setAppGps] = useState<Coordinate | undefined>()
  const [myGps660Lat, setMyGps660Lat] = useState('')
  const [myGps660Lng, setMyGps660Lng] = useState('')
  const [gpsMessage, setGpsMessage] = useState('')
  const [media, setMedia] = useState<MediaArtifact[]>([])
  const [message, setMessage] = useState('')
  const [hardErrors, setHardErrors] = useState<QaFinding[]>([])
  const [warnings, setWarnings] = useState<QaFinding[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0]
  const visibleFields = useMemo(
    () => selectedTemplate.fields.filter((field) => shouldShowField(field, sample, selectedTemplate, fieldValues)),
    [fieldValues, sample, selectedTemplate],
  )
  const fieldsBySection = groupBySection(visibleFields)

  function fieldValue(field: SurveyField) {
    return fieldValues[field.id] ?? initialValue(sample, field.id)
  }

  function setFieldValue(fieldId: string, value: string) {
    setFieldValues((current) => ({ ...current, [fieldId]: value }))
  }

  function captureGps() {
    if (!navigator.geolocation) {
      setGpsMessage('이 브라우저에서는 GPS 수집을 지원하지 않습니다.')
      return
    }

    setGpsMessage('위치 권한을 허용해 주세요.')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAppGps({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        })
        setGpsMessage('GPS 수집 완료')
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGpsMessage('위치 권한이 거부되었습니다. 브라우저/태블릿 설정에서 위치 권한을 허용해 주세요.')
          return
        }
        if (error.code === error.TIMEOUT) {
          setGpsMessage('GPS 수집 시간이 초과되었습니다. 하늘이 보이는 곳에서 다시 시도해 주세요.')
          return
        }
        setGpsMessage('GPS 수집 실패')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function uploadPhoto(photoType: PhotoType, file?: File) {
    if (!file) return
    setMessage(`${photoTypeLabelKo(photoType)} 업로드 중입니다...`)

    const formData = new FormData()
    formData.set('file', file)
    formData.set('sampleId', sample.id)
    formData.set('photoType', photoType)
    if (photoType === 'mygps660_screen') {
      formData.set('manual_lat', myGps660Lat)
      formData.set('manual_lng', myGps660Lng)
    }

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })
    const result = (await response.json()) as {
      ok: boolean
      media?: MediaArtifact
      message?: string
    }

    if (!response.ok || !result.ok || !result.media) {
      setMessage(result.message ?? '사진 업로드에 실패했습니다.')
      return
    }

    setMedia((current) => [...current.filter((item) => item.photoType !== photoType), result.media as MediaArtifact])
    setMessage(`${photoTypeLabelKo(photoType)} 업로드가 완료되었습니다.`)
  }

  function renderField(field: SurveyField) {
    const value = fieldValue(field)
    const shared = {
      name: field.id,
      required: field.required,
      placeholder: field.placeholder,
      value,
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setFieldValue(field.id, event.target.value),
    }

    if (field.type === 'textarea') {
      return (
        <>
          <textarea {...shared} />
          {isNoteField(field) ? (
            <div className="nav">
              {quickNoteTemplates.map((template) => (
                <button className="button" key={template.label} type="button" onClick={() => setFieldValue(field.id, template.text)}>
                  {template.label}
                </button>
              ))}
            </div>
          ) : null}
        </>
      )
    }

    if (field.type === 'select') {
      return (
        <select {...shared}>
          <option value="">선택</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    }

    if (field.type === 'checkbox') {
      return (
        <div className="checkbox-grid">
          {field.options?.map((option) => (
            <label className="checkbox-item" key={option.value}>
              <input name={field.id} type="checkbox" value={option.value} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )
    }

    return (
      <input
        {...shared}
        type={field.type === 'date' || field.type === 'boolean' ? 'text' : field.type}
        pattern={field.type === 'date' ? '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$' : undefined}
        maxLength={field.type === 'date' ? 5 : undefined}
        inputMode={field.inputMode}
        min={field.min}
        max={field.max}
      />
    )
  }

  function buildSubmission(formData: FormData, status: 'draft' | 'submitted') {
    const myGps660LatValue = parseCoordinateValue(formData.get('mygps660_lat'))
    const myGps660LngValue = parseCoordinateValue(formData.get('mygps660_lng'))
    const myGps660Coordinate =
      myGps660LatValue !== undefined && myGps660LngValue !== undefined
        ? { latitude: myGps660LatValue, longitude: myGps660LngValue }
        : undefined
    const now = new Date().toISOString()
    const answers = visibleFields.map((field) => {
      const values = formData.getAll(field.id).map((item) => String(item).trim())
      return {
        fieldId: field.id,
        fieldLabel: field.label,
        required: field.required,
        fieldType: field.type,
        min: field.min,
        max: field.max,
        value: field.type === 'checkbox' ? values : String(formData.get(field.id) ?? '').trim(),
      }
    })

    return {
      id: 'client-preview',
      sampleId: sample.id,
      surveyorId: sample.assignedSurveyorId,
      templateId: selectedTemplate.id,
      surveyType: selectedTemplate.title,
      status,
      answers,
      media,
      appGps,
      myGps660Coordinate,
      createdAt: now,
      updatedAt: now,
      submittedAt: status === 'submitted' ? now : undefined,
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    setHardErrors([])
    setWarnings([])

    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const requestedStatus = submitter?.value === 'draft' ? 'draft' : 'submitted'
    const formData = new FormData(event.currentTarget)
    const submission = buildSubmission(formData, requestedStatus)
    const validation = runRuleValidationAgent(submission)
    setWarnings(validation.warnings)

    if (requestedStatus === 'submitted' && !validation.canSubmit) {
      setHardErrors(validation.hardErrors)
      setMessage('제출할 수 없습니다. 아래 항목을 수정해 주세요.')
      setIsSubmitting(false)
      return
    }

    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sampleId: sample.id,
        crop: sample.crop,
        variety: sample.variety,
        surveyMonth: sample.surveyMonth,
        templateId: selectedTemplate.id,
        surveyType: selectedTemplate.title,
        status: requestedStatus,
        answers: submission.answers,
        appGps: submission.appGps,
        myGps660Coordinate: submission.myGps660Coordinate,
        media,
      }),
    })

    const result = (await response.json()) as {
      ok: boolean
      submissionId?: string
      message?: string
      hardErrors?: QaFinding[]
      warnings?: QaFinding[]
    }

    setIsSubmitting(false)
    setHardErrors(result.hardErrors ?? [])
    setWarnings(result.warnings ?? validation.warnings)
    setMessage(
      response.ok && result.ok
        ? requestedStatus === 'draft'
          ? '임시저장 완료'
          : `제출 완료: ${result.submissionId}`
        : result.message ?? '제출에 실패했습니다.',
    )
  }

  return (
    <form className="form-grid" onSubmit={submit} noValidate>
      {hardErrors.length > 0 ? (
        <div className="card status qa_required">
          <h3>제출할 수 없습니다. 아래 항목을 수정해 주세요.</h3>
          <ul>
            {hardErrors.map((item) => (
              <li key={item.code}>{item.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="card">
          <h3>확인 필요</h3>
          <ul>
            {warnings.map((item) => (
              <li key={item.code}>{item.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <label className="field">
        조사 유형 선택
        <select
          value={selectedTemplateId}
          onChange={(event) => {
            setSelectedTemplateId(event.target.value)
            setFieldValues({})
          }}
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.title}
            </option>
          ))}
        </select>
      </label>

      <div className="grid">
        <label className="field">
          조사월
          <input name="survey_month" value={sample.surveyMonth} readOnly />
        </label>
        <label className="field">
          표본 ID
          <input name="sample_id" value={sample.id} readOnly />
        </label>
        <label className="field">
          품목/품종
          <input name="crop" value={`${sample.cropLabel} / ${sample.variety}`} readOnly />
        </label>
      </div>

      {Object.entries(fieldsBySection).map(([section, fields]) => (
        <div className="card" key={section}>
          <h3>{section}</h3>
          <div className="form-grid">
            {fields.map((field) => (
              <label className="field" key={field.id}>
                <span>
                  {field.label}
                  {field.required ? ' *' : ''}
                </span>
                {field.help ? <span className="muted">{field.help}</span> : null}
                {field.id.includes('training_system') ? (
                  <span className="muted">
                    재배 수형 판단이 어려운 경우 농가에 먼저 확인하세요. 그래도 판단이 어려우면 확인불가를 선택하고,
                    정면·측면 등 여러 각도에서 사진을 촬영한 뒤 사유를 입력하세요.
                  </span>
                ) : null}
                {renderField(field)}
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="card">
        <h3>GPS 증빙</h3>
        <div className="nav">
          <button className="button" type="button" onClick={captureGps}>
            GPS 수집
          </button>
        </div>
        <p className="muted">
          {appGps
            ? `${appGps.latitude.toFixed(6)}, ${appGps.longitude.toFixed(6)} ±${Math.round(
                appGps.accuracyMeters ?? 0,
              )}m`
            : gpsMessage || '위치 권한을 허용해 주세요.'}
        </p>
        <div className="grid">
          <label className="field">
            MyGPS660 위도
            <input
              name="mygps660_lat"
              inputMode="decimal"
              placeholder="36.000000"
              value={myGps660Lat}
              onChange={(event) => setMyGps660Lat(event.target.value)}
            />
          </label>
          <label className="field">
            MyGPS660 경도
            <input
              name="mygps660_lng"
              inputMode="decimal"
              placeholder="127.000000"
              value={myGps660Lng}
              onChange={(event) => setMyGps660Lng(event.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="card">
        <h3>사진 업로드</h3>
        <p className="muted">태블릿 카메라로 촬영 후 업로드하세요. Drive 업로드가 완료되어야 제출할 수 있습니다.</p>
        <p className="muted">MyGPS660 화면 사진은 위도/경도 수동 입력값과 사진 판독값이 일치해야 합니다.</p>
        <div className="grid">
          {REQUIRED_PHOTO_TYPES.map((photoType) => (
            <label className="field" key={photoType}>
              {photoTypeLabelKo(photoType)}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => uploadPhoto(photoType, event.target.files?.[0])}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="nav">
        <button className="button" type="submit" name="status" value="draft" disabled={isSubmitting}>
          임시저장
        </button>
        <button className="button" type="submit" name="status" value="submitted" disabled={isSubmitting}>
          {isSubmitting ? '제출 중...' : '제출'}
        </button>
      </div>
      {message ? <p className="muted">{message}</p> : null}
    </form>
  )
}
