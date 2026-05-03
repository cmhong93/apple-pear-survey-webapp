'use client'

import { useMemo, useState } from 'react'
import { REQUIRED_PHOTO_TYPES } from '@/data/constants'
import { photoTypeLabelKo } from '@/lib/koreanLabels'
import type { MediaArtifact, PhotoType } from '@/types/media'
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

export function SurveySubmissionForm({ sample, templates }: SurveySubmissionFormProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? '')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [appGps, setAppGps] = useState<Coordinate | undefined>()
  const [gpsMessage, setGpsMessage] = useState('')
  const [media, setMedia] = useState<MediaArtifact[]>([])
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0]
  const visibleFields = useMemo(
    () => selectedTemplate.fields.filter((field) => shouldShowField(field, sample, selectedTemplate, fieldValues)),
    [fieldValues, sample, selectedTemplate],
  )
  const fieldsBySection = groupBySection(visibleFields)

  function captureGps() {
    setGpsMessage('GPS를 수집하는 중입니다...')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAppGps({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        })
        setGpsMessage('GPS 수집이 완료되었습니다.')
      },
      () => {
        setGpsMessage('GPS 수집에 실패했습니다. 태블릿 위치 권한을 확인하세요.')
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

    const uploadedMedia = result.media
    setMedia((current) => [...current.filter((item) => item.photoType !== photoType), uploadedMedia])
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

    if (field.type === 'textarea') {
      return <textarea {...shared} />
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
        type={field.type === 'boolean' ? 'text' : field.type}
        inputMode={field.inputMode}
        min={field.min}
        max={field.max}
      />
    )
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    const formData = new FormData(event.currentTarget)
    const myGps660Lat = Number(formData.get('mygps660_lat'))
    const myGps660Lng = Number(formData.get('mygps660_lng'))
    const myGps660Coordinate =
      Number.isFinite(myGps660Lat) && Number.isFinite(myGps660Lng)
        ? { latitude: myGps660Lat, longitude: myGps660Lng }
        : undefined

    const answers = visibleFields.map((field) => {
      const values = formData.getAll(field.id).map((value) => String(value))
      return {
        fieldId: field.id,
        fieldLabel: field.label,
        value: field.type === 'checkbox' ? values : String(formData.get(field.id) ?? ''),
      }
    })

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
        answers,
        appGps,
        myGps660Coordinate,
        media,
      }),
    })

    const result = (await response.json()) as {
      ok: boolean
      submissionId?: string
      qaIssueCount?: number
      message?: string
    }

    setIsSubmitting(false)
    setMessage(
      response.ok && result.ok
        ? `제출 완료: ${result.submissionId}. 보완 필요 항목 ${result.qaIssueCount ?? 0}건.`
        : result.message ?? '제출에 실패했습니다.',
    )
  }

  return (
    <form className="form-grid" onSubmit={submit}>
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
            <input name="mygps660_lat" inputMode="decimal" placeholder="36.000000" />
          </label>
          <label className="field">
            MyGPS660 경도
            <input name="mygps660_lng" inputMode="decimal" placeholder="127.000000" />
          </label>
        </div>
      </div>

      <div className="card">
        <h3>사진 업로드</h3>
        <p className="muted">사진은 구글 드라이브에 저장되고, 파일 ID는 제출 기록과 연결됩니다.</p>
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
        <button className="button" type="button" onClick={() => setMessage('임시저장은 다음 단계에서 Sheets draft로 연결됩니다.')}>
          임시저장
        </button>
        <button className="button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? '제출 중...' : '제출'}
        </button>
      </div>
      {message ? <p className="muted">{message}</p> : null}
    </form>
  )
}
