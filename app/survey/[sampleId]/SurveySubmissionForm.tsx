'use client'

import { useMemo, useState } from 'react'
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
    const shared = {
      name: field.id,
      required: field.required,
      placeholder: field.placeholder,
      defaultValue: initialValue(sample, field.id),
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setFieldValues((current) => ({ ...current, [field.id]: event.target.value })),
    }

    if (field.type === 'textarea') return <textarea {...shared} />

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
    const myGps660Lat = parseCoordinateValue(formData.get('mygps660_lat'))
    const myGps660Lng = parseCoordinateValue(formData.get('mygps660_lng'))
    const myGps660Coordinate =
      myGps660Lat !== undefined && myGps660Lng !== undefined
        ? { latitude: myGps660Lat, longitude: myGps660Lng }
        : undefined
    const now = new Date().toISOString()
    const answers = visibleFields.map((field) => {
      const values = formData.getAll(field.id).map((value) => String(value).trim())
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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
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
                {field.id === 'field_trade_status' ? (
                  <span className="muted">
                    포전거래는 수확 전에 과원 또는 필지를 통째로 상인에게 넘기는 거래입니다. 농가가 직접 수확·출하하면 X를 선택하세요.
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
            : gpsMessage || '아직 GPS를 수집하지 않았습니다.'}
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
