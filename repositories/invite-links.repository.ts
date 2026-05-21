import { createAdminClient } from '@/lib/supabase/admin'

export type InviteLink = {
  id: string
  token: string
  created_by: string | null
  target_player_id: string | null
  target_name: string | null
  target_email: string | null
  target_phone: string | null
  intent: 'new_player' | 'coach' | 'club_owner'
  custom_message: string | null
  expires_at: string
  max_uses: number | null
  use_count: number
  is_active: boolean
  created_at: string
}

export type CreateInviteLinkInput = {
  created_by?: string
  target_player_id?: string
  target_name?: string
  target_email?: string
  target_phone?: string
  intent: 'new_player' | 'coach' | 'club_owner'
  custom_message?: string
  expires_at: string
  max_uses?: number
}

// Obtener un link por token (público — para validar)
export async function getInviteLinkByToken(token: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('invite_links')
    .select('*, target_player:target_player_id(id, first_name, last_name, email, city)')
    .eq('token', token)
    .single()
  if (error) return null
  return data
}

// Crear un invite link (solo admin)
export async function createInviteLink(input: CreateInviteLinkInput) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('invite_links')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

// Listar todos los links (solo admin)
export async function getAllInviteLinks() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('invite_links')
    .select('*, created_by_player:created_by(first_name, last_name), target_player:target_player_id(first_name, last_name, email)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// Incrementar use_count
export async function incrementInviteLinkUse(token: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.rpc('increment_invite_link_use', { p_token: token })
  if (error) throw error
}

// Desactivar un link
export async function deactivateInviteLink(id: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('invite_links')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw error
}

// Renovar vigencia
export async function renewInviteLink(id: string, expires_at: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('invite_links')
    .update({ expires_at, is_active: true })
    .eq('id', id)
  if (error) throw error
}
