import { NextRequest, NextResponse } from 'next/server'
import { validateInviteLink } from '@/services/invite-links.service'

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const result = await validateInviteLink(params.token)

  if (!result.valid) {
    return NextResponse.json(
      { valid: false, reason: result.reason },
      { status: 200 }
    )
  }

  // No exponer datos sensibles
  const { link } = result
  return NextResponse.json({
    valid: true,
    intent: link.intent,
    target_name: link.target_name,
    target_email: link.target_email,
    has_target_player: !!link.target_player_id,
    target_player: link.target_player ? {
      id: (link.target_player as { id: string }).id,
      first_name: (link.target_player as { first_name: string }).first_name,
      last_name: (link.target_player as { last_name: string }).last_name,
      city: (link.target_player as { city: string | null }).city,
    } : null,
    custom_message: link.custom_message,
  })
}
