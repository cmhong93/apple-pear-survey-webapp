import { NextResponse } from 'next/server'
import { geocodeAddress } from '@/lib/kakao'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { address?: string }
  const result = await geocodeAddress(body.address ?? '')
  return NextResponse.json(result)
}
