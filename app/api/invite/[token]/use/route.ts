import { NextRequest, NextResponse } from 'next/server'
import { useInviteLink } from '@/services/invite-links.service'

export async function POST(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await useInviteLink(params.token)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
