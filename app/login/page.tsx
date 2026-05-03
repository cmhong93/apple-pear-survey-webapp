import { redirect } from 'next/navigation'
import { MVP_SURVEYORS } from '@/data/constants'
import { getSession } from '@/lib/auth'
import { LoginForm } from './LoginForm'

export default async function LoginPage() {
  const session = await getSession()
  if (session?.role === 'admin') redirect('/admin')
  if (session?.role === 'surveyor') redirect('/survey')

  return (
    <section className="hero-panel">
      <span className="eyebrow">로그인</span>
      <h1>조사원·관리자 로그인</h1>
      <p className="muted">조사원 ID 또는 관리자 ID와 비밀번호를 입력하세요.</p>
      <LoginForm />
      <div className="card">
        <h3>조사원 ID</h3>
        <p>{MVP_SURVEYORS.map((surveyor) => surveyor.id).join(', ')}</p>
      </div>
    </section>
  )
}
