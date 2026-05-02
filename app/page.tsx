import Link from 'next/link'
import { MVP_SURVEYORS, STATUS_LABELS } from '@/data/constants'
import { mockSamples } from '@/data/mockSamples'

export default function HomePage() {
  const pending = mockSamples.filter((sample) => sample.status === 'pending').length
  const submitted = mockSamples.filter((sample) => sample.status === 'submitted').length

  return (
    <section className="hero-panel">
      <span className="eyebrow">MVP Foundation</span>
      <h1>2026 Chungnam apple and pear survey operations hub</h1>
      <p className="muted">
        Tablet survey shells, sample data, agent skeletons, and safe API stubs are ready for
        incremental implementation.
      </p>
      <div className="nav">
        <Link className="button" href="/survey">
          Open surveyor app
        </Link>
        <Link className="button" href="/admin">
          Open admin dashboard
        </Link>
      </div>
      <div className="grid">
        <div className="card">
          <h3>Surveyors</h3>
          <p>{MVP_SURVEYORS.length} field surveyors configured for MVP login.</p>
        </div>
        <div className="card">
          <h3>{STATUS_LABELS.pending}</h3>
          <p>{pending} mock samples waiting for survey input.</p>
        </div>
        <div className="card">
          <h3>{STATUS_LABELS.submitted}</h3>
          <p>{submitted} mock submissions ready for QA review.</p>
        </div>
      </div>
    </section>
  )
}
