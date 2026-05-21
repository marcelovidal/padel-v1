'use server'

import {
  createNewInviteLink,
  listAllInviteLinks,
  disableInviteLink,
  extendInviteLink,
  validateInviteLink,
} from '@/services/invite-links.service'
import { createAdminClient } from '@/lib/supabase/admin'
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

  const { expires_days, max_uses, created_by, ...rest } = formData
  const link = await createNewInviteLink({
    ...rest,
    expires_at,
    ...(created_by ? { created_by } : {}),
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

export async function searchPlayersForInviteAction(query: string) {
  if (query.length < 2) return []
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('players')
    .select('id, first_name, last_name, display_name, email, phone, city, user_id, is_coach, is_club_owner')
    .or(
      `first_name.ilike.%${query}%,last_name.ilike.%${query}%,display_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`
    )
    .is('deleted_at', null)
    .limit(8)
  return (data ?? []).map((p) => ({ ...p, claimed: !!p.user_id }))
}

export async function createUnclaimedPlayerAction(input: {
  first_name: string
  last_name: string
  email?: string
  phone?: string
  city?: string
}) {
  const supabase = createAdminClient()
  const display_name = `${input.first_name} ${input.last_name}`.trim()
  const { data, error } = await supabase
    .from('players')
    .insert({ ...input, display_name, is_guest: false } as any)
    .select('id, first_name, last_name, display_name, email, phone, city, user_id, is_coach, is_club_owner')
    .single()
  if (error) throw error
  return { ...(data as any), claimed: false }
}
