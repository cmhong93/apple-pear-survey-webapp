import { redirect } from 'next/navigation'
import { STATUS_LABELS } from '@/data/constants'
import { getSession } from '@/lib/auth'
import { readSampleMaster, readSurveyAnswers, readSurveySubmissions } from '@/lib/googleSheets'

export default async function AdminSubmissionsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/survey')

  let samples
  let submissions
  let answers
  try {
    ;[samples, submissions, answers] = await Promise.all([readSampleMaster(), readSurveySubmissions(), readSurveyAnswers()])
  } catch (error) {
    return (
      <section className="hero-panel">
        <span className="eyebrow">설정 필요</span>
        <h1>구글 시트 연결이 준비되지 않았습니다</h1>
        <p className="muted">{error instanceof Error ? error.message : '제출 목록을 읽지 못했습니다.'}</p>
      </section>
    )
  }

  const latestSubmissionBySample = new Map(
    submissions.map((submission) => [submission.sample_id || submission.sampleId, submission]),
  )
  const answerLabelsBySubmission = answers.reduce<Record<string, string[]>>((acc, answer) => {
    const submissionId = answer.submission_id || answer.submissionId
    const label = answer.field_label || answer.fieldLabel
    if (submissionId && label) acc[submissionId] = [...(acc[submissionId] ?? []), label]
    return acc
  }, {})

  return (
    <section className="hero-panel">
      <span className="eyebrow">검토</span>
      <h1>제출 목록</h1>
      <p className="muted">구글 시트에 저장된 표본과 제출 현황을 표시합니다.</p>
      <table className="table">
        <thead>
          <tr>
            <th>표본</th>
            <th>품목/품종</th>
            <th>농가명</th>
            <th>연락처</th>
            <th>필지주소</th>
            <th>조사원</th>
            <th>조사월</th>
            <th>조사상태</th>
            <th>제출 ID</th>
            <th>저장 문항</th>
          </tr>
        </thead>
        <tbody>
          {samples.map((sample) => {
            const latestSubmission = latestSubmissionBySample.get(sample.id)
            const submissionId = latestSubmission?.submission_id ?? latestSubmission?.submissionId ?? ''
            const status = (latestSubmission ? 'submitted' : sample.status) as keyof typeof STATUS_LABELS
            return (
              <tr key={sample.id}>
                <td>{sample.id}</td>
                <td>
                  {sample.cropLabel} / {sample.variety}
                </td>
                <td>{sample.farmerName ?? '-'}</td>
                <td>{sample.mobilePhone || sample.phone || '-'}</td>
                <td>
                  {sample.city} {sample.town}
                  <br />
                  <span className="muted">{sample.fieldAddress ?? '-'}</span>
                </td>
                <td>{sample.assignedSurveyorId || '미배정'}</td>
                <td>{sample.surveyMonth}</td>
                <td>
                  <span className={`status ${status}`}>{STATUS_LABELS[status]}</span>
                </td>
                <td>{submissionId || '-'}</td>
                <td>{(answerLabelsBySubmission[submissionId] ?? []).slice(0, 4).join(', ') || '-'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
