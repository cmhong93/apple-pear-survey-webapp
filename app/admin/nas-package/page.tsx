import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function AdminNasPackagePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/survey')

  return (
    <section className="hero-panel">
      <span className="eyebrow">NAS</span>
      <h1>NAS package manifest</h1>
      <p className="muted">
        Approved submissions will be gathered into a NAS-ready manifest before ZIP generation is added.
      </p>
      <div className="card">
        <h3>Naming plan</h3>
        <p>{'{sample_id}_{survey_month}_{photo_type}_{surveyor_id}_approved.jpg'}</p>
      </div>
    </section>
  )
}
