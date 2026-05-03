import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { ADMIN_ROLE, MVP_SURVEYORS } from '@/data/constants'

export const SESSION_COOKIE_NAME = 'apple_pear_survey_session'

export type AppRole = 'admin' | 'surveyor'

export interface UserSession {
  role: AppRole
  userId: string
  surveyorId?: string
  expiresAt: number
}

export interface LoginResult {
  ok: boolean
  session?: UserSession
  redirectTo?: string
  message: string
}

function isLocalDevelopment() {
  return process.env.NODE_ENV !== 'production'
}

function isPreviewEnvironment() {
  return process.env.VERCEL_ENV === 'preview' || isLocalDevelopment()
}

export function isTestSurveyorId(surveyorId?: string) {
  return surveyorId?.toUpperCase() === 'TEST03'
}

export function isTestSampleId(sampleId?: string) {
  return sampleId?.toUpperCase().startsWith('TEST-') ?? false
}

function getSurveyorSecret() {
  return process.env.APP_SURVEYOR_SHARED_SECRET || process.env.ADMIN_TOKEN || (isLocalDevelopment() ? 'dev-surveyor-pin' : '')
}

function getAdminPassword() {
  return process.env.APP_ADMIN_PASSWORD || process.env.ADMIN_TOKEN || (isLocalDevelopment() ? 'dev-admin-password' : '')
}

function getSessionSecret() {
  return (
    process.env.APP_SESSION_SECRET ||
    process.env.APP_ADMIN_PASSWORD ||
    process.env.APP_SURVEYOR_SHARED_SECRET ||
    process.env.ADMIN_TOKEN ||
    (isLocalDevelopment() ? 'dev-session-secret' : '')
  )
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function sign(payload: string) {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function authenticateMvpLogin(identifier: string, secret: string): LoginResult {
  const normalized = identifier.trim().toUpperCase()
  const surveyor = MVP_SURVEYORS.find((item) => item.id === normalized)
  const isPreviewTestSurveyor = normalized === 'TEST03' && isPreviewEnvironment()
  const expiresAt = Date.now() + 1000 * 60 * 60 * 12

  if ((surveyor || isPreviewTestSurveyor) && getSurveyorSecret() && safeEqual(secret, getSurveyorSecret())) {
    return {
      ok: true,
      redirectTo: '/survey',
      message: '조사원 로그인이 완료되었습니다.',
      session: {
        role: 'surveyor',
        userId: normalized,
        surveyorId: normalized,
        expiresAt,
      },
    }
  }

  if (normalized === ADMIN_ROLE.toUpperCase() && getAdminPassword() && safeEqual(secret, getAdminPassword())) {
    return {
      ok: true,
      redirectTo: '/admin',
      message: '관리자 로그인이 완료되었습니다.',
      session: {
        role: 'admin',
        userId: ADMIN_ROLE,
        expiresAt,
      },
    }
  }

  return { ok: false, message: 'ID 또는 비밀번호가 올바르지 않습니다.' }
}

export function createSessionToken(session: UserSession) {
  const payload = encodeBase64Url(JSON.stringify(session))
  return `${payload}.${sign(payload)}`
}

export function parseSessionToken(token?: string): UserSession | null {
  if (!token || !getSessionSecret()) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null

  try {
    const session = JSON.parse(decodeBase64Url(payload)) as UserSession
    if (!session.expiresAt || session.expiresAt < Date.now()) return null
    return session
  } catch {
    return null
  }
}

export async function getSession() {
  const cookieStore = await cookies()
  return parseSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value)
}

export function canAccessSample(session: UserSession, assignedSurveyorId: string) {
  return session.role === 'admin' || session.surveyorId === assignedSurveyorId
}
