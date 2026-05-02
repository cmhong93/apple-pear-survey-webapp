import { mockSamples } from '@/data/mockSamples'

export default function AdminSubmissionsPage() {
  return (
    <section className="hero-panel">
      <span className="eyebrow">Review</span>
      <h1>Submissions</h1>
      <p className="muted">Submission records will come from Google Sheets in a later PR.</p>
      <table className="table">
        <thead>
          <tr>
            <th>Sample</th>
            <th>Surveyor</th>
            <th>Month</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {mockSamples.map((sample) => (
            <tr key={sample.id}>
              <td>{sample.id}</td>
              <td>{sample.assignedSurveyorId}</td>
              <td>{sample.surveyMonth}</td>
              <td>{sample.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
