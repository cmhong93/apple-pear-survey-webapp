import Link from 'next/link'
import { STATUS_LABELS } from '@/data/constants'
import { mockSamples } from '@/data/mockSamples'

export default function SurveyPage() {
  return (
    <section className="hero-panel">
      <span className="eyebrow">Surveyor tablet</span>
      <h1>Assigned samples</h1>
      <p className="muted">Mock sample list. Surveyor filtering will be implemented in the login PR.</p>
      <table className="table">
        <thead>
          <tr>
            <th>Sample</th>
            <th>Crop</th>
            <th>Surveyor</th>
            <th>Status</th>
            <th>Open</th>
          </tr>
        </thead>
        <tbody>
          {mockSamples.map((sample) => (
            <tr key={sample.id}>
              <td>{sample.id}</td>
              <td>{sample.crop}</td>
              <td>{sample.assignedSurveyorId}</td>
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
    </section>
  )
}
