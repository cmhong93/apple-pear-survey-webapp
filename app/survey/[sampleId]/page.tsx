import { notFound, redirect } from 'next/navigation'
import { LogoutButton } from '@/app/components/LogoutButton'
import { getSampleById } from '@/data/mockSamples'
import { surveyTemplates } from '@/data/surveyTemplates'
import { canAccessSample, getSession, isTestSampleId, isTestSurveyorId } from '@/lib/auth'
import { readSampleMaster } from '@/lib/googleSheets'
import { statusLabelKo } from '@/lib/koreanLabels'
import { SurveySubmissionForm } from './SurveySubmissionForm'

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ sampleId: string }>
}) {
  const { sampleId: rawSampleId } = await params
  const sampleId = decodeURIComponent(rawSampleId)
  const session = await getSession()
  if (!session) redirect('/login')

  let sample = getSampleById(sampleId)
  try {
    sample = (await readSampleMaster()).find((item) => item.id === sampleId) ?? sample
  } catch {
    if (process.env.NODE_ENV === 'production') throw new Error('구글 시트 표본 원장 연결이 준비되지 않았습니다.')
  }

  if (!sample) notFound()
  if (!canAccessSample(session, sample.assignedSurveyorId)) redirect('/survey')
  if (isTestSurveyorId(session.surveyorId) && !isTestSampleId(sample.id)) redirect('/survey')

  return (
    <section className="hero-panel">
      <span className="eyebrow">{sample.id}</span>
      <h1>태블릿 현장조사</h1>
      <p className="muted">
        {sample.farmerName ?? '농가명 없음'} / {sample.mobilePhone || sample.phone || '연락처 없음'} / {sample.city}{' '}
        {sample.town} / {sample.assignedSurveyorId || '미배정'} / {sample.surveyMonth}
      </p>
      <div className="grid">
        <div className="card">
          <h3>표본 정보</h3>
          <p>표본 ID: {sample.id}</p>
          <p className="muted">
            품목/품종: {sample.cropLabel} / {sample.variety}
          </p>
          <p className="muted">조사상태: {statusLabelKo(sample.status)}</p>
        </div>
        <div className="card">
          <h3>농가 연락처</h3>
          <p>농가명: {sample.farmerName ?? '-'}</p>
          <p className="muted">연락처: {sample.mobilePhone || sample.phone || '-'}</p>
        </div>
        <div className="card">
          <h3>주소</h3>
          <p>필지주소: {sample.fieldAddress ?? '-'}</p>
          <p className="muted">자택주소: {sample.homeAddress ?? '-'}</p>
        </div>
      </div>
      <div className="nav">
        <LogoutButton />
      </div>
      <SurveySubmissionForm sample={sample} templates={surveyTemplates} />
    </section>
  )
}
