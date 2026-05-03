import { redirect } from 'next/navigation'
import { STATUS_LABELS } from '@/data/constants'
import { getSession } from '@/lib/auth'
import { readSampleMaster, readSurveySubmissions } from '@/lib/googleSheets'

export default async function AdminSubmissionsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/survey')

  let samples
  let submissions
  try {
    ;[samples, submissions] = await Promise.all([readSampleMaster(), readSurveySubmissions()])
  } catch (error) {
    return (
      <section className="hero-panel">
        <span className="eyebrow">Configuration required</span>
        <h1>Google Sheets is not ready</h1>
        <p className="muted">{error instanceof Error ? error.message : 'Failed to read submissions.'}</p>
      </section>
    )
  }

  const latestSubmissionBySample = new Map(
    submissions.map((submission) => [submission.sample_id || submission.sampleId, submission]),
  )

  return (
    <section className="hero-panel">
      <span className="eyebrow">Review</span>
      <h1>Submissions</h1>
      <p className="muted">Showing sample and submission status from Google Sheets when configured.</p>
      <table className="table">
        <thead>
          <tr>
            <th>Sample</th>
            <th>Crop</th>
            <th>Farmer</th>
            <th>Contact</th>
            <th>Area</th>
            <th>Surveyor</th>
            <th>Month</th>
            <th>Status</th>
            <th>Submission</th>
          </tr>
        </thead>
        <tbody>
          {samples.map((sample) => (
            <tr key={sample.id}>
              <td>{sample.id}</td>
              <td>
                {sample.cropLabel} / {sample.variety}
              </td>
              <td>{sample.farmerName ?? '-'}</td>
              <td>{sample.mobilePhone || sample.phone || '-'}</td>
              <td>
                {sample.city} {sample.town}
                <br />
                <span className="muted">{sample.fieldAddress ?? '-'}</span>
              </td>
              <td>{sample.assignedSurveyorId || 'Unassigned'}</td>
              <td>{sample.surveyMonth}</td>
              <td>
                <span className={`status ${sample.status}`}>{STATUS_LABELS[sample.status]}</span>
              </td>
              <td>{latestSubmissionBySample.get(sample.id)?.submission_id ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
