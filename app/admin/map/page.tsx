import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { formatCoordinate } from '@/lib/geo'
import { readSampleMaster } from '@/lib/googleSheets'

export default async function AdminMapPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/survey')
  const samples = await readSampleMaster()

  return (
    <section className="hero-panel">
      <span className="eyebrow">Kakao map shell</span>
      <h1>Sample map</h1>
      <p className="muted">Kakao JS map integration will be added after server REST stubs are validated.</p>
      <div className="grid">
        {samples.map((sample) => (
          <div className="card" key={sample.id}>
            <h3>{sample.id}</h3>
            <p>
              {sample.city} {sample.town}
            </p>
            <p className="muted">{formatCoordinate(sample.expectedCoordinate)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
