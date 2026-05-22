'use server'

import {
  createNewInviteLink,
  listAllInviteLinks,
  disableInviteLink,
  extendInviteLink,
  validateInviteLink,
  markInviteLinkUsed,
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

export async function completeInviteRegistrationAction(input: {
  token: string
  userData: {
    first_name: string
    last_name: string
    city: string
    category: string   // 'beginner' | 'intermediate' | 'advanced' | 'competitive'
    position: string   // 'reves' | 'drive' | 'ambas'
    email: string
    intent: string
    existing_player_id?: string | null
    club_name?: string
    club_courts?: string
    club_city?: string
  }
}) {
  const supabase = createAdminClient()

  // 1. Validar token
  const link = await validateInviteLink(input.token)
  if (!link.valid) throw new Error(`[token] Link inválido o vencido: ${link.reason}`)

  const { userData } = input
  console.log('[invite] userData recibido:', JSON.stringify(userData))

  const isCoach = userData.intent === 'coach'
  const isClubOwner = userData.intent === 'club_owner'

  let playerId: string | null = userData.existing_player_id ?? null

  if (playerId) {
    // 2a. Actualizar jugador existente
    const { error: updateErr } = await supabase
      .from('players')
      .update({
        city: userData.city,
        category: userData.category as any,
        position: userData.position as any,
        ...(isCoach ? { is_coach: true } : {}),
        ...(isClubOwner ? { is_club_owner: true } : {}),
      } as any)
      .eq('id', playerId)
    if (updateErr) {
      console.error('[invite] error update player:', updateErr)
      throw new Error(`[player_update] ${updateErr.message}`)
    }
    console.log('[invite] jugador actualizado:', playerId)
  } else {
    // 2b. Crear jugador nuevo
    const display_name = `${userData.first_name} ${userData.last_name}`.trim()
    const { data: newPlayer, error: insertErr } = await supabase
      .from('players')
      .insert({
        first_name: userData.first_name,
        last_name: userData.last_name,
        display_name,
        city: userData.city,
        category: userData.category as any,
        position: userData.position as any,
        email: userData.email,
        is_guest: false,
        is_coach: isCoach,
        is_club_owner: isClubOwner,
      } as any)
      .select('id')
      .single()
    if (insertErr) {
      console.error('[invite] error insert player:', insertErr)
      throw new Error(`[player_insert] ${insertErr.message} (code: ${insertErr.code})`)
    }
    playerId = (newPlayer as any).id
    console.log('[invite] jugador creado:', playerId)
  }

  // 3. Club owner — crear el club
  if (isClubOwner && userData.club_name && playerId) {
    const { error: clubErr } = await supabase.from('clubs').insert({
      name: userData.club_name,
      city: userData.club_city ?? userData.city,
      owner_player_id: playerId,
    } as any)
    if (clubErr) {
      console.error('[invite] error insert club:', clubErr)
      throw new Error(`[club_insert] ${clubErr.message}`)
    }
  }

  // 4. Enviar email de activación via Supabase Auth
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const activateUrl = `${appUrl}/auth/callback?next=/invite/activate`
  console.log('[invite] inviteUserByEmail →', userData.email, '| redirectTo:', activateUrl)
  const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
    userData.email,
    { redirectTo: activateUrl }
  )

  if (inviteErr) {
    if (inviteErr.code === 'email_exists') {
      // Usuario ya existe en Auth — enviar magic link en su lugar
      console.log('[invite] usuario existente, enviando OTP magic link')
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: userData.email,
        options: { shouldCreateUser: false, emailRedirectTo: activateUrl },
      })
      if (otpErr) {
        console.error('[invite] error signInWithOtp:', otpErr)
        throw new Error(`[auth_otp] ${otpErr.message}`)
      }
    } else {
      console.error('[invite] error inviteUserByEmail:', inviteErr)
      throw new Error(`[auth_invite] ${inviteErr.message}`)
    }
  }

  // 5. Marcar uso del link
  await markInviteLinkUsed(input.token)
  console.log('[invite] completado OK')

  return { ok: true }
}

export async function linkPlayerToUserAction(userId: string, email: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('players')
    .update({ user_id: userId })
    .eq('email', email)
    .is('user_id', null)
  if (error) throw error
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
