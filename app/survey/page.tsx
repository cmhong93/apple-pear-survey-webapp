import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/app/components/LogoutButton'
import { STATUS_LABELS } from '@/data/constants'
import { getSession } from '@/lib/auth'
import { readSampleMaster } from '@/lib/googleSheets'

export default async function SurveyPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  let samples
  try {
    samples = await readSampleMaster()
  } catch (error) {
    return (
      <section className="hero-panel">
        <span className="eyebrow">Configuration required</span>
        <h1>Google Sheets is not ready</h1>
        <p className="muted">{error instanceof Error ? error.message : 'Failed to read sample_master.'}</p>
        <LogoutButton />
      </section>
    )
  }

  const visibleSamples =
    session.role === 'admin'
      ? samples
      : samples.filter((sample) => sample.assignedSurveyorId === session.surveyorId)

  return (
    <section className="hero-panel">
      <span className="eyebrow">Surveyor tablet</span>
      <h1>Assigned samples</h1>
      <p className="muted">
        Signed in as {session.userId}. {session.role === 'admin' ? 'Showing all samples.' : 'Showing assigned samples only.'}
      </p>
      <div className="nav">
        <LogoutButton />
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Sample</th>
            <th>Crop</th>
            <th>Farmer</th>
            <th>Contact</th>
            <th>Area</th>
            <th>Surveyor</th>
            <th>Status</th>
            <th>Open</th>
          </tr>
        </thead>
        <tbody>
          {visibleSamples.map((sample) => (
            <tr key={sample.id}>
              <td>{sample.id}</td>
              <td>
                {sample.cropLabel} / {sample.variety}
              </td>
              <td>{sample.farmerName ?? '-'}</td>
              <td>{sample.mobilePhone || sample.phone || '-'}</td>
              <td>
                <strong>
                  {sample.city} {sample.town}
                </strong>
                <br />
                <span className="muted">{sample.fieldAddress ?? '-'}</span>
              </td>
              <td>{sample.assignedSurveyorId || 'Unassigned'}</td>
              <td>
                <span className={`status ${sample.status}`}>{STATUS_LABELS[sample.status]}</span>
              </td>
              <td>
                <Link className="button" href={`/survey/${sample.id}`}>
                  Survey
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {visibleSamples.length === 0 ? <p className="muted">No assigned samples.</p> : null}
    </section>
  )
}
