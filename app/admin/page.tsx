import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/app/components/LogoutButton'
import { STATUS_LABELS } from '@/data/constants'
import { MVP_SURVEYORS } from '@/data/constants'
import { getSession } from '@/lib/auth'
import { readSampleMaster, readSurveySubmissions } from '@/lib/googleSheets'

export default async function AdminPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/survey')

  let samples
  let submissions
  try {
    ;[samples, submissions] = await Promise.all([readSampleMaster(), readSurveySubmissions()])
  } catch (error) {
    return (
      <section className="hero-panel">
        <span className="eyebrow">설정 필요</span>
        <h1>구글 시트 연결이 준비되지 않았습니다</h1>
        <p className="muted">{error instanceof Error ? error.message : '관리자 데이터를 읽지 못했습니다.'}</p>
        <LogoutButton />
      </section>
    )
  }
  const submittedSampleIds = new Set(submissions.map((row) => row.sample_id || row.sampleId))
  const counts = samples.reduce<Record<string, number>>((acc, sample) => {
    const status = submittedSampleIds.has(sample.id) ? 'submitted' : sample.status
    acc[status] = (acc[status] ?? 0) + 1
    return acc
  }, {})
  const countBySurveyor = MVP_SURVEYORS.map((surveyor) => ({
    ...surveyor,
    count: samples.filter((sample) => sample.assignedSurveyorId === surveyor.id).length,
  }))
  const dashboardStatuses = ['pending', 'submitted', 'qa_required', 'approved', 'rejected'] as const

  return (
    <section className="hero-panel">
      <span className="eyebrow">관리자</span>
      <h1>관리자 대시보드</h1>
      <p className="muted">전체 표본과 제출 현황을 확인합니다.</p>
      <div className="grid">
        <div className="card">
          <h3>전체 표본 수</h3>
          <p>{samples.length}건</p>
        </div>
        <div className="card">
          <h3>제출완료</h3>
          <p>{submissions.length}건</p>
        </div>
        {dashboardStatuses.map((status) => (
          <div className="card" key={status}>
            <h3>{STATUS_LABELS[status]}</h3>
            <p>{counts[status] ?? 0}건</p>
          </div>
        ))}
      </div>
      <h2>조사원별 진행률</h2>
      <div className="grid">
        {countBySurveyor.map((item) => (
          <div className="card" key={item.id}>
            <h3>{item.id}</h3>
            <p>{item.count}건 배정</p>
          </div>
        ))}
      </div>
      <div className="nav">
        <Link className="button" href="/admin/submissions">
          제출 목록
        </Link>
        <Link className="button" href="/admin/issues">
          보완필요
        </Link>
        <Link className="button" href="/admin/map">
          지도
        </Link>
        <Link className="button" href="/admin/nas-package">
          NAS 패키지
        </Link>
        <LogoutButton />
      </div>
    </section>
  )
}
