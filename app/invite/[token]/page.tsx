import { validateInviteLink } from '@/services/invite-links.service'
import { InviteChat } from './InviteChat'
import { PasalaLogo } from '@/components/ui/PasalaLogo'

export const metadata = { robots: 'noindex' }

function InviteInvalid({ reason }: { reason: string }) {
  const messages: Record<string, string> = {
    not_found: 'Este link no existe.',
    inactive: 'Este link fue desactivado.',
    expired: 'Este link venció.',
    exhausted: 'Este link ya fue utilizado.',
  }
  return (
    <div className="min-h-screen bg-[#0C0C0C] flex items-center justify-center px-6">
      <div className="text-center">
        <div className="mx-auto mb-8 flex justify-center">
          <PasalaLogo variant="dark" size="lg" />
        </div>
        <p className="text-[#F5F2EE] text-lg font-sans">
          {messages[reason] ?? 'Link inválido.'}
        </p>
        <a
          href="/"
          className="text-[#E5352A] text-sm mt-4 inline-block hover:underline"
        >
          Ir al inicio →
        </a>
      </div>
    </div>
  )
}

export default async function InvitePage({
  params,
}: {
  params: { token: string }
}) {
  const result = await validateInviteLink(params.token)

  if (!result.valid) {
    return <InviteInvalid reason={result.reason} />
  }

  const { link } = result
  const tp = link.target_player as {
    id: string
    first_name: string
    last_name: string
    city: string | null
  } | null

  return (
    <InviteChat
      token={params.token}
      intent={link.intent}
      targetName={link.target_name}
      targetEmail={link.target_email}
      targetPlayer={tp}
      customMessage={link.custom_message}
    />
  )
}
