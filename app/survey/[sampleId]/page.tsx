import { notFound } from 'next/navigation'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/app/components/LogoutButton'
import { getSampleById } from '@/data/mockSamples'
import { getSurveyTemplateByCrop } from '@/data/surveyTemplates'
import { canAccessSample, getSession } from '@/lib/auth'

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ sampleId: string }>
}) {
  const { sampleId } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  const sample = getSampleById(sampleId)
  if (!sample) notFound()
  if (!canAccessSample(session, sample.assignedSurveyorId)) redirect('/survey')

  const template = getSurveyTemplateByCrop(sample.crop)
  if (!template) notFound()

  return (
    <section className="hero-panel">
      <span className="eyebrow">{sample.id}</span>
      <h1>{template.title}</h1>
      <p className="muted">
        {sample.city} {sample.town} · {sample.assignedSurveyorId} · {sample.surveyMonth}
      </p>
      <div className="grid">
        <div className="card">
          <h3>Sample</h3>
          <p>{sample.id}</p>
          <p className="muted">
            {sample.crop} · {sample.variety}
          </p>
        </div>
        <div className="card">
          <h3>Future tablet form</h3>
          <p>PR #3 will turn this shell into the source-of-truth survey form engine.</p>
        </div>
      </div>
      <div className="nav">
        <LogoutButton />
      </div>
      <form className="form-grid">
        {template.fields.map((field) => (
          <label className="field" key={field.id}>
            {field.label}
            {field.type === 'textarea' ? (
              <textarea name={field.id} placeholder={field.placeholder} />
            ) : field.type === 'select' ? (
              <select name={field.id}>
                <option value="">Select</option>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'boolean' ? (
              <select name={field.id}>
                <option value="">Select</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : (
              <input name={field.id} type={field.type} placeholder={field.placeholder} />
            )}
          </label>
        ))}
        <button className="button" type="button">
          Save MVP draft
        </button>
      </form>
    </section>
  )
}
