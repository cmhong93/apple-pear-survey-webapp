import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function AdminIssuesPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/survey')

  return (
    <section className="hero-panel">
      <span className="eyebrow">보완 검수</span>
      <h1>보완필요 목록</h1>
      <p className="muted">규칙 검수, 위치 증빙, 사진 증빙 보완요청이 여기에 표시됩니다.</p>
      <div className="card">
        <h3>현재 열린 보완요청 없음</h3>
        <p>제출값 검수 결과가 발생하면 보완요청으로 표시됩니다.</p>
      </div>
    </section>
  )
}
