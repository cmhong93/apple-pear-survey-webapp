import { MVP_SURVEYORS } from '@/data/constants'

export default function LoginPage() {
  return (
    <section className="hero-panel">
      <span className="eyebrow">Access</span>
      <h1>Surveyor and admin login</h1>
      <p className="muted">MVP shell for simple ID/PIN login. Real auth rules land in the next PR.</p>
      <form className="form-grid">
        <label className="field">
          ID
          <input name="identifier" placeholder="S01 or admin" />
        </label>
        <label className="field">
          PIN
          <input name="secret" type="password" placeholder="MVP PIN" />
        </label>
        <button className="button" type="button">
          Continue
        </button>
      </form>
      <div className="card">
        <h3>MVP surveyors</h3>
        <p>{MVP_SURVEYORS.map((surveyor) => surveyor.id).join(', ')}</p>
      </div>
    </section>
  )
}
