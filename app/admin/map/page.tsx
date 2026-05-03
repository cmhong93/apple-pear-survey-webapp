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
      <span className="eyebrow">지도</span>
      <h1>표본 위치 지도</h1>
      <p className="muted">필지 위치와 GPS 증빙을 확인합니다.</p>
      <div className="grid">
        {samples.map((sample) => (
          <div className="card" key={sample.id}>
            <h3>{sample.id}</h3>
            <p>
              {sample.farmerName ?? '-'} / {sample.city} {sample.town}
            </p>
            <p className="muted">{sample.fieldAddress ?? '-'}</p>
            <p className="muted">{formatCoordinate(sample.expectedCoordinate)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
