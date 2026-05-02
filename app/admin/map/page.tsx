import { mockSamples } from '@/data/mockSamples'
import { formatCoordinate } from '@/lib/geo'

export default function AdminMapPage() {
  return (
    <section className="hero-panel">
      <span className="eyebrow">Kakao map shell</span>
      <h1>Sample map</h1>
      <p className="muted">Kakao JS map integration will be added after server REST stubs are validated.</p>
      <div className="grid">
        {mockSamples.map((sample) => (
          <div className="card" key={sample.id}>
            <h3>{sample.id}</h3>
            <p>{sample.address}</p>
            <p className="muted">{formatCoordinate(sample.expectedCoordinate)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
