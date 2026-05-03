import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/app/components/LogoutButton'
import { STATUS_LABELS } from '@/data/constants'
import { MVP_SURVEYORS } from '@/data/constants'
import { getSession } from '@/lib/auth'
import { readSampleMaster, readSurveySubmissions } from '@/lib/googleSheets'

export default async function AdminPage() {
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
        <p className="muted">{error instanceof Error ? error.message : 'Failed to read admin data.'}</p>
        <LogoutButton />
      </section>
    )
  }
  const submittedSampleIds = new Set(submissions.map((row) => row.sample_id || row.sampleId))
  const counts = samples.reduce<Record<string, number>>((acc, sample) => {
    const status = submittedSampleIds.has(sample.id) ? 'submitted' : sample.status
    acc[status] = (acc[status] ?? 0) + 1
    return acc
  }, {})
  const countBySurveyor = MVP_SURVEYORS.map((surveyor) => ({
    ...surveyor,
    count: samples.filter((sample) => sample.assignedSurveyorId === surveyor.id).length,
  }))

  return (
    <section className="hero-panel">
      <span className="eyebrow">Admin</span>
      <h1>Survey operations dashboard</h1>
      <p className="muted">Signed in as admin. All status values are mock data until Sheets integration lands.</p>
      <div className="grid">
        <div className="card">
          <h3>Total</h3>
          <p>{samples.length} samples</p>
        </div>
        <div className="card">
          <h3>Submissions</h3>
          <p>{submissions.length} saved rows</p>
        </div>
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <div className="card" key={status}>
            <h3>{label}</h3>
            <p>{counts[status] ?? 0} samples</p>
          </div>
        ))}
      </div>
      <div className="grid">
        {countBySurveyor.map((item) => (
          <div className="card" key={item.id}>
            <h3>{item.id}</h3>
            <p>{item.count} assigned samples</p>
          </div>
        ))}
      </div>
      <div className="nav">
        <Link className="button" href="/admin/submissions">
          Submissions
        </Link>
        <Link className="button" href="/admin/issues">
          Issues
        </Link>
        <Link className="button" href="/admin/map">
          Map
        </Link>
        <Link className="button" href="/admin/nas-package">
          NAS package
        </Link>
        <LogoutButton />
      </div>
    </section>
  )
}
