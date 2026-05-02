import { NextResponse } from 'next/server'
import { authenticateMvpLogin } from '@/lib/auth'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    identifier?: string
    secret?: string
  }

  const result = authenticateMvpLogin(body.identifier ?? '', body.secret ?? '')
  return NextResponse.json(result, { status: result.ok ? 200 : 401 })
}
