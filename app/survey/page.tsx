import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/app/components/LogoutButton'
import { STATUS_LABELS } from '@/data/constants'
import { getSession } from '@/lib/auth'
import { readSampleMaster } from '@/lib/googleSheets'

export default async function SurveyPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  let samples
  try {
    samples = await readSampleMaster()
  } catch (error) {
    return (
      <section className="hero-panel">
        <span className="eyebrow">설정 필요</span>
        <h1>구글 시트 연결이 준비되지 않았습니다</h1>
        <p className="muted">{error instanceof Error ? error.message : '표본 원장을 읽지 못했습니다.'}</p>
        <LogoutButton />
      </section>
    )
  }

  const visibleSamples =
    session.role === 'admin'
      ? samples
      : samples.filter((sample) => sample.assignedSurveyorId === session.surveyorId)

  return (
    <section className="hero-panel">
      <span className="eyebrow">조사원 태블릿</span>
      <h1>배정 표본 목록</h1>
      <p className="muted">
        로그인 ID: {session.userId}. {session.role === 'admin' ? '전체 표본을 표시합니다.' : '배정된 표본만 표시합니다.'}
      </p>
      <div className="nav">
        <LogoutButton />
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>표본</th>
            <th>품목/품종</th>
            <th>농가명</th>
            <th>연락처</th>
            <th>필지주소</th>
            <th>조사원</th>
            <th>조사상태</th>
            <th>조사 시작</th>
          </tr>
        </thead>
        <tbody>
          {visibleSamples.map((sample) => (
            <tr key={sample.id}>
              <td>{sample.id}</td>
              <td>
                {sample.cropLabel} / {sample.variety}
              </td>
              <td>{sample.farmerName ?? '-'}</td>
              <td>{sample.mobilePhone || sample.phone || '-'}</td>
              <td>
                <strong>
                  {sample.city} {sample.town}
                </strong>
                <br />
                <span className="muted">{sample.fieldAddress ?? '-'}</span>
              </td>
              <td>{sample.assignedSurveyorId || '미배정'}</td>
              <td>
                <span className={`status ${sample.status}`}>{STATUS_LABELS[sample.status]}</span>
              </td>
              <td>
                <Link className="button" href={`/survey/${encodeURIComponent(sample.id)}`}>
                  조사 시작
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {visibleSamples.length === 0 ? <p className="muted">배정된 표본이 없습니다.</p> : null}
    </section>
  )
}
