import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function AdminNasPackagePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/survey')

  return (
    <section className="hero-panel">
      <span className="eyebrow">NAS</span>
      <h1>NAS 패키지 목록</h1>
      <p className="muted">
        승인완료 제출건을 NAS 업로드용 목록으로 정리합니다.
      </p>
      <div className="card">
        <h3>파일명 규칙</h3>
        <p>{'{표본ID}_{조사월}_{사진유형}_{조사원}_승인.jpg'}</p>
      </div>
    </section>
  )
}
