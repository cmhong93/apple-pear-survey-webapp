import Link from 'next/link'
import { MVP_SURVEYORS, STATUS_LABELS } from '@/data/constants'
import { mockSamples } from '@/data/mockSamples'

export default function HomePage() {
  const pending = mockSamples.filter((sample) => sample.status === 'pending').length
  const submitted = mockSamples.filter((sample) => sample.status === 'submitted').length

  return (
    <section className="hero-panel">
      <span className="eyebrow">현장조사</span>
      <h1>2026 충남 사과·배 현장조사 운영</h1>
      <p className="muted">
        조사원 태블릿 입력, 사진 업로드, GPS 증빙, 관리자 검수를 한 곳에서 운영합니다.
      </p>
      <div className="nav">
        <Link className="button" href="/survey">
          조사원 화면
        </Link>
        <Link className="button" href="/admin">
          관리자 대시보드
        </Link>
      </div>
      <div className="grid">
        <div className="card">
          <h3>조사원</h3>
          <p>{MVP_SURVEYORS.length}명 조사원이 로그인할 수 있습니다.</p>
        </div>
        <div className="card">
          <h3>{STATUS_LABELS.pending}</h3>
          <p>{pending}건 조사대기 표본이 있습니다.</p>
        </div>
        <div className="card">
          <h3>{STATUS_LABELS.submitted}</h3>
          <p>{submitted}건 제출완료 표본이 있습니다.</p>
        </div>
      </div>
    </section>
  )
}
