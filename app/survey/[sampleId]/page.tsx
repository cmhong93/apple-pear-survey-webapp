import { notFound, redirect } from 'next/navigation'
import { LogoutButton } from '@/app/components/LogoutButton'
import { getSampleById } from '@/data/mockSamples'
import { getSurveyTemplateByCrop } from '@/data/surveyTemplates'
import { canAccessSample, getSession } from '@/lib/auth'
import { readSampleMaster } from '@/lib/googleSheets'
import { SurveySubmissionForm } from './SurveySubmissionForm'

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ sampleId: string }>
}) {
  const { sampleId } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  let sample = getSampleById(sampleId)
  try {
    sample = (await readSampleMaster()).find((item) => item.id === sampleId) ?? sample
  } catch {
    if (process.env.NODE_ENV === 'production') throw new Error('Google Sheets sample_master is not configured.')
  }

  if (!sample) notFound()
  if (!canAccessSample(session, sample.assignedSurveyorId)) redirect('/survey')

  const template = getSurveyTemplateByCrop(sample.crop)
  if (!template) notFound()

  return (
    <section className="hero-panel">
      <span className="eyebrow">{sample.id}</span>
      <h1>{template.title}</h1>
      <p className="muted">
        {sample.farmerName ?? 'Unknown farmer'} / {sample.mobilePhone || sample.phone || 'No contact'} /{' '}
        {sample.city} {sample.town} / {sample.assignedSurveyorId || 'Unassigned'} / {sample.surveyMonth}
      </p>
      <div className="grid">
        <div className="card">
          <h3>Sample</h3>
          <p>{sample.id}</p>
          <p className="muted">
            {sample.cropLabel} / {sample.variety}
          </p>
        </div>
        <div className="card">
          <h3>Field address</h3>
          <p>{sample.fieldAddress ?? '-'}</p>
          <p className="muted">Home: {sample.homeAddress ?? '-'}</p>
        </div>
        <div className="card">
          <h3>Tablet form</h3>
          <p>This v0 form saves field submissions to Google Sheets when configured.</p>
        </div>
      </div>
      <div className="nav">
        <LogoutButton />
      </div>
      <SurveySubmissionForm sample={sample} fields={template.fields} />
    </section>
  )
}
