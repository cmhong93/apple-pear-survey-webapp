import { NextResponse } from 'next/server'
import { reverseGeocode } from '@/lib/kakao'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    latitude?: number
    longitude?: number
  }
  const result = await reverseGeocode(Number(body.latitude), Number(body.longitude))
  return NextResponse.json(result)
}
