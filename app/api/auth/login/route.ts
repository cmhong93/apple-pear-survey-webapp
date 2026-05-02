import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE_NAME, authenticateMvpLogin, createSessionToken } from '@/lib/auth'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    identifier?: string
    secret?: string
  }

  const result = authenticateMvpLogin(body.identifier ?? '', body.secret ?? '')
  if (!result.ok || !result.session) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, createSessionToken(result.session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(result.session.expiresAt),
  })

  return NextResponse.json({
    ok: true,
    message: result.message,
    redirectTo: result.redirectTo,
    user: {
      role: result.session.role,
      userId: result.session.userId,
      surveyorId: result.session.surveyorId,
    },
  })
}
