import { NextRequest, NextResponse } from 'next/server'
import { markInviteLinkUsed } from '@/services/invite-links.service'

export async function POST(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await markInviteLinkUsed(params.token)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
