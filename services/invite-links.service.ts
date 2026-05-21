import {
  getInviteLinkByToken,
  createInviteLink,
  getAllInviteLinks,
  incrementInviteLinkUse,
  deactivateInviteLink,
  renewInviteLink,
  type CreateInviteLinkInput,
} from '@/repositories/invite-links.repository'

// Validar si un link es usable
export async function validateInviteLink(token: string) {
  const link = await getInviteLinkByToken(token)

  if (!link) return { valid: false as const, reason: 'not_found' }
  if (!link.is_active) return { valid: false as const, reason: 'inactive' }
  if (new Date(link.expires_at) < new Date())
    return { valid: false as const, reason: 'expired' }
  if (link.max_uses !== null && link.use_count >= link.max_uses)
    return { valid: false as const, reason: 'exhausted' }

  return { valid: true as const, link }
}

// Crear link con defaults
export async function createNewInviteLink(input: CreateInviteLinkInput) {
  return createInviteLink(input)
}

export async function listAllInviteLinks() {
  return getAllInviteLinks()
}

export async function useInviteLink(token: string) {
  return incrementInviteLinkUse(token)
}

export async function disableInviteLink(id: string) {
  return deactivateInviteLink(id)
}

export async function extendInviteLink(id: string, days: number) {
  const expires_at = new Date(
    Date.now() + days * 24 * 60 * 60 * 1000
  ).toISOString()
  return renewInviteLink(id, expires_at)
}
