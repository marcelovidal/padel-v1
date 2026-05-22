'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { PasalaLogo } from '@/components/ui/PasalaLogo'
import { linkPlayerToUserAction } from '@/lib/actions/invite-links.actions'

const CATEGORY_LABELS: Record<string, string> = {
  '1': '1ª — Competitivo',
  '2': '2ª — Avanzado',
  '3': '3ª — Intermedio Alto',
  '4': '4ª — Intermedio',
  '5': '5ª — Intermedio Bajo',
  '6': '6ª — Amateur',
  '7': '7ª — Principiante',
}

const POSITION_LABELS: Record<string, string> = {
  reves: 'Revés',
  drive: 'Drive',
  ambas: 'Las dos',
}

type PlayerData = {
  display_name: string
  city: string | null
  category: string | null
  position: string | null
  email: string | null
}

export default function InviteActivatePage() {
  const supabase = createBrowserSupabase()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [playerData, setPlayerData] = useState<PlayerData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setCheckingSession(false)
      if (!data.session) {
        setError('El enlace de activación es inválido o expiró.')
        return
      }
      const user = data.session.user

      // Link the players record to this auth user
      try {
        await linkPlayerToUserAction(user.id, user.email!)
      } catch (e) {
        console.error('[activate] link player:', e)
      }

      // Fetch player data to display summary
      const { data: player } = await supabase
        .from('players')
        .select('display_name, city, category, position, email')
        .eq('user_id', user.id)
        .maybeSingle()

      if (mounted) {
        setPlayerData(player ?? {
          display_name: user.email ?? 'Jugador',
          city: null,
          category: null,
          position: null,
          email: user.email ?? null,
        })
      }
    })
    return () => {
      mounted = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConfirm() {
    setError(null)
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }
    setSuccess(true)
    setTimeout(() => {
      router.replace('/player')
      router.refresh()
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-[#0C0C0C] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <PasalaLogo variant="dark" size="lg" />
        </div>

        {checkingSession ? (
          <p className="text-[#999] text-sm text-center">Validando enlace...</p>
        ) : error && !success ? (
          <div className="text-center space-y-4">
            <p className="text-[#F5F2EE] text-base">{error}</p>
            <a
              href="/player/login"
              className="text-[#E5352A] text-sm hover:underline inline-block"
            >
              Ir al inicio de sesión →
            </a>
          </div>
        ) : success ? (
          <div className="text-center space-y-3">
            <p className="text-[#F5F2EE] text-lg font-semibold">
              Contraseña guardada
            </p>
            <p className="text-[#999] text-sm">Redirigiendo a tu perfil...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <p className="text-[#F5F2EE] text-xl font-bold">
                {playerData ? `Hola, ${playerData.display_name.split(' ')[0]}` : 'Bienvenido'}
              </p>
              <p className="text-[#999] text-sm">
                Creá una contraseña para acceder a tu cuenta.
              </p>
            </div>

            {/* Resumen de registro */}
            {playerData && (
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl px-4 py-4 space-y-2 text-sm">
                <p className="text-[#555] text-xs uppercase tracking-wider mb-3">Tu perfil</p>
                <div className="flex justify-between">
                  <span className="text-[#666]">Nombre</span>
                  <span className="text-[#F5F2EE]">{playerData.display_name}</span>
                </div>
                {playerData.city && (
                  <div className="flex justify-between">
                    <span className="text-[#666]">Ciudad</span>
                    <span className="text-[#F5F2EE]">{playerData.city}</span>
                  </div>
                )}
                {playerData.category && (
                  <div className="flex justify-between">
                    <span className="text-[#666]">Categoría</span>
                    <span className="text-[#F5F2EE]">{CATEGORY_LABELS[playerData.category] ?? playerData.category}</span>
                  </div>
                )}
                {playerData.position && (
                  <div className="flex justify-between">
                    <span className="text-[#666]">Posición</span>
                    <span className="text-[#F5F2EE]">{POSITION_LABELS[playerData.position] ?? playerData.position}</span>
                  </div>
                )}
                {playerData.email && (
                  <div className="flex justify-between">
                    <span className="text-[#666]">Email</span>
                    <span className="text-[#F5F2EE] truncate max-w-[180px]">{playerData.email}</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[#999] text-xs mb-1.5 uppercase tracking-wider">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F2EE] rounded-xl px-4 py-3 text-sm placeholder:text-[#555] focus:outline-none focus:border-[#E5352A] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[#999] text-xs mb-1.5 uppercase tracking-wider">
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetí la contraseña"
                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F2EE] rounded-xl px-4 py-3 text-sm placeholder:text-[#555] focus:outline-none focus:border-[#E5352A] transition-colors"
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                />
              </div>

              {error && (
                <p className="text-[#E5352A] text-sm">{error}</p>
              )}

              <button
                onClick={handleConfirm}
                disabled={loading}
                className="w-full bg-[#E5352A] hover:bg-[#cc2d22] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors text-sm"
              >
                {loading ? 'Guardando...' : 'Confirmar contraseña'}
              </button>
            </div>

            <p className="text-center text-[#555] text-xs">
              También podés{' '}
              <a
                href="/player"
                className="text-[#999] hover:text-[#F5F2EE] underline"
              >
                ingresar sin contraseña
              </a>{' '}
              por ahora.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
