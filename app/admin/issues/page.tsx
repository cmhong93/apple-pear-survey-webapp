import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function AdminIssuesPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/survey')

  return (
    <section className="hero-panel">
      <span className="eyebrow">Agentic QA</span>
      <h1>QA issues</h1>
      <p className="muted">Rule, geo, vision, and evidence matching issues will appear here.</p>
      <div className="card">
        <h3>No open mock issues</h3>
        <p>Run `/api/qa` with a submission payload to generate MVP issue stubs.</p>
      </div>
    </section>
  )
}
