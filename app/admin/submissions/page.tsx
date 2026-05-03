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
      <p className="muted">Submission records will come from Google Sheets in a later PR.</p>
      <table className="table">
        <thead>
          <tr>
            <th>Sample</th>
            <th>Crop</th>
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
                {sample.crop} · {sample.variety}
              </td>
              <td>
                {sample.city} {sample.town}
              </td>
              <td>{sample.assignedSurveyorId}</td>
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
