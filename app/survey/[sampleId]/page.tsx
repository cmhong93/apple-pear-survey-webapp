import { notFound } from 'next/navigation'
import { getSampleById } from '@/data/mockSamples'
import { getSurveyTemplateByCrop } from '@/data/surveyTemplates'

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ sampleId: string }>
}) {
  const { sampleId } = await params
  const sample = getSampleById(sampleId)
  if (!sample) notFound()

  const template = getSurveyTemplateByCrop(sample.crop)
  if (!template) notFound()

  return (
    <section className="hero-panel">
      <span className="eyebrow">{sample.id}</span>
      <h1>{template.title}</h1>
      <p className="muted">
        {sample.address} · {sample.assignedSurveyorId} · {sample.surveyMonth}
      </p>
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
