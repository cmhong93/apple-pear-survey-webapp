import Link from 'next/link'
import { STATUS_LABELS } from '@/data/constants'
import { mockSamples } from '@/data/mockSamples'

export default function AdminPage() {
  const counts = mockSamples.reduce<Record<string, number>>((acc, sample) => {
    acc[sample.status] = (acc[sample.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <section className="hero-panel">
      <span className="eyebrow">Admin</span>
      <h1>Survey operations dashboard</h1>
      <p className="muted">All status values are mock data until Sheets integration lands.</p>
      <div className="grid">
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <div className="card" key={status}>
            <h3>{label}</h3>
            <p>{counts[status] ?? 0} samples</p>
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
      </div>
    </section>
  )
}
