'use server'

import {
  createNewInviteLink,
  listAllInviteLinks,
  disableInviteLink,
  extendInviteLink,
  validateInviteLink,
} from '@/services/invite-links.service'
import { revalidatePath } from 'next/cache'

export async function createInviteLinkAction(formData: {
  intent: 'new_player' | 'coach' | 'club_owner'
  target_player_id?: string
  target_name?: string
  target_email?: string
  target_phone?: string
  custom_message?: string
  expires_days: number
  max_uses: number | null
  created_by: string
}) {
  const expires_at = new Date(
    Date.now() + formData.expires_days * 24 * 60 * 60 * 1000
  ).toISOString()

  const { expires_days, max_uses, ...rest } = formData
  const link = await createNewInviteLink({
    ...rest,
    expires_at,
    ...(max_uses !== null ? { max_uses } : {}),
  })

  revalidatePath('/admin/invite-links')
  return { ok: true, link }
}

export async function getInviteLinksAction() {
  return listAllInviteLinks()
}

export async function deactivateInviteLinkAction(id: string) {
  await disableInviteLink(id)
  revalidatePath('/admin/invite-links')
  return { ok: true }
}

export async function renewInviteLinkAction(id: string, days: number) {
  await extendInviteLink(id, days)
  revalidatePath('/admin/invite-links')
  return { ok: true }
}

export async function validateInviteLinkAction(token: string) {
  return validateInviteLink(token)
}
