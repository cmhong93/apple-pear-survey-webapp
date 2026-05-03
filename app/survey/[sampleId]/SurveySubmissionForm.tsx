'use client'

import { useState } from 'react'
import { REQUIRED_PHOTO_TYPES } from '@/data/constants'
import type { MediaArtifact, PhotoType } from '@/types/media'
import type { Coordinate, Sample } from '@/types/sample'
import type { SurveyField } from '@/types/survey'

interface SurveySubmissionFormProps {
  sample: Sample
  fields: SurveyField[]
}

const photoLabels: Record<PhotoType, string> = {
  plot_photo: 'Plot photo',
  tree1_photo: 'Tree 1 photo',
  tree2_photo: 'Tree 2 photo',
  tree3_photo: 'Tree 3 photo',
  mygps660_screen: 'MyGPS660 screen',
}

export function SurveySubmissionForm({ sample, fields }: SurveySubmissionFormProps) {
  const [appGps, setAppGps] = useState<Coordinate | undefined>()
  const [gpsMessage, setGpsMessage] = useState('')
  const [media, setMedia] = useState<MediaArtifact[]>([])
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function captureGps() {
    setGpsMessage('Capturing GPS...')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAppGps({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        })
        setGpsMessage('GPS captured.')
      },
      () => {
        setGpsMessage('GPS capture failed. Check tablet location permission.')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function uploadPhoto(photoType: PhotoType, file?: File) {
    if (!file) return
    setMessage(`Uploading ${photoLabels[photoType]}...`)

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
      setMessage(result.message ?? 'Photo upload failed.')
      return
    }

    const uploadedMedia = result.media
    setMedia((current) => [...current.filter((item) => item.photoType !== photoType), uploadedMedia])
    setMessage(`${photoLabels[photoType]} uploaded.`)
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

    const answers = fields.map((field) => ({
      fieldId: field.id,
      value: String(formData.get(field.id) ?? ''),
    }))

    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sampleId: sample.id,
        crop: sample.crop,
        variety: sample.variety,
        surveyMonth: sample.surveyMonth,
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
        ? `Submitted ${result.submissionId}. QA issues: ${result.qaIssueCount ?? 0}.`
        : result.message ?? 'Submit failed.',
    )
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <div className="grid">
        <label className="field">
          Survey month
          <input name="survey_month" value={sample.surveyMonth} readOnly />
        </label>
        <label className="field">
          Sample ID
          <input name="sample_id" value={sample.id} readOnly />
        </label>
        <label className="field">
          Crop
          <input name="crop" value={`${sample.cropLabel} / ${sample.variety}`} readOnly />
        </label>
      </div>

      {fields.map((field) => (
        <label className="field" key={field.id}>
          {field.label}
          {field.type === 'textarea' ? (
            <textarea name={field.id} required={field.required} placeholder={field.placeholder} />
          ) : field.type === 'select' ? (
            <select name={field.id} required={field.required}>
              <option value="">Select</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input name={field.id} type={field.type} required={field.required} placeholder={field.placeholder} />
          )}
        </label>
      ))}

      <div className="card">
        <h3>GPS evidence</h3>
        <div className="nav">
          <button className="button" type="button" onClick={captureGps}>
            Capture app GPS
          </button>
        </div>
        <p className="muted">
          {appGps
            ? `${appGps.latitude.toFixed(6)}, ${appGps.longitude.toFixed(6)} ±${Math.round(
                appGps.accuracyMeters ?? 0,
              )}m`
            : gpsMessage || 'App GPS not captured yet.'}
        </p>
        <div className="grid">
          <label className="field">
            MyGPS660 latitude
            <input name="mygps660_lat" inputMode="decimal" placeholder="36.000000" />
          </label>
          <label className="field">
            MyGPS660 longitude
            <input name="mygps660_lng" inputMode="decimal" placeholder="127.000000" />
          </label>
        </div>
      </div>

      <div className="card">
        <h3>Photo evidence</h3>
        <p className="muted">Photos upload to Google Drive when Drive env is configured.</p>
        <div className="grid">
          {REQUIRED_PHOTO_TYPES.map((photoType) => (
            <label className="field" key={photoType}>
              {photoLabels[photoType]}
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

      <button className="button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit to Sheets'}
      </button>
      {message ? <p className="muted">{message}</p> : null}
    </form>
  )
}
