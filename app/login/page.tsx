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
      <span className="eyebrow">Access</span>
      <h1>Surveyor and admin login</h1>
      <p className="muted">MVP shell for simple ID/PIN login. Real auth rules land in the next PR.</p>
      <LoginForm />
      <div className="card">
        <h3>MVP surveyors</h3>
        <p>{MVP_SURVEYORS.map((surveyor) => surveyor.id).join(', ')}</p>
      </div>
    </section>
  )
}
