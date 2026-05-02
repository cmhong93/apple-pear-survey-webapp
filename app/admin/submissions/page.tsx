import { redirect } from 'next/navigation'
import { STATUS_LABELS } from '@/data/constants'
import { getSession } from '@/lib/auth'
import { readSampleMaster } from '@/lib/googleSheets'

export default async function AdminSubmissionsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/survey')

  const samples = await readSampleMaster()

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
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
