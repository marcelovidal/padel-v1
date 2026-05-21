'use client'

import { useEffect, useRef, useState } from 'react'
import { PasalaLogo } from '@/components/ui/PasalaLogo'
import { Send } from 'lucide-react'
import { completeInviteRegistrationAction } from '@/lib/actions/invite-links.actions'

// ── Types ─────────────────────────────────────────────────────────────────────

type Intent = 'new_player' | 'coach' | 'club_owner'

type TargetPlayer = {
  id: string
  first_name: string
  last_name: string
  city: string | null
}

interface Props {
  token: string
  intent: Intent
  targetName: string | null
  targetEmail: string | null
  targetPlayer: TargetPlayer | null
  customMessage: string | null
}

type Message = {
  id: number
  role: 'app' | 'user'
  text: string
}

type InputMode =
  | { type: 'options'; options: string[] }
  | { type: 'text'; placeholder: string; field: string }
  | { type: 'email'; placeholder: string; field: string }
  | { type: 'none' }

type FlowStep = 'chat' | 'done'

// Provincias y ciudades
const PROVINCIAS_CIUDADES: Record<string, string[]> = {
  'Río Negro':        ['General Roca', 'Bariloche', 'Cipolletti', 'Allen', 'Viedma', 'Villa Regina', 'Catriel', 'Cinco Saltos', 'El Bolsón', 'Ingeniero Jacobacci'],
  'Neuquén':          ['Neuquén capital', 'Plottier', 'Centenario', 'San Martín de los Andes', 'Junín de los Andes', 'Zapala', 'Cutral Có', 'Villa La Angostura', 'Rincón de los Sauces', 'Las Lajas'],
  'Chubut':           ['Comodoro Rivadavia', 'Trelew', 'Puerto Madryn', 'Rawson', 'Esquel', 'Rada Tilly'],
  'Santa Cruz':       ['Río Gallegos', 'Caleta Olivia', 'El Calafate', 'El Chaltén', 'Puerto Deseado', 'Pico Truncado'],
  'Tierra del Fuego': ['Ushuaia', 'Río Grande', 'Tolhuin'],
  'La Pampa':         ['Santa Rosa', 'General Pico', 'Toay'],
  'Buenos Aires':     ['Buenos Aires', 'Mar del Plata', 'Bahía Blanca', 'La Plata', 'Rosario'],
  'Otra provincia':   ['Otra ciudad'],
}

// Level / position maps
const LEVEL_MAP: Record<string, string> = {
  'Principiante 🌱': 'beginner',
  'Intermedio 🎾':   'intermediate',
  'Avanzado ⚡':     'advanced',
  'Competitivo 🏆':  'competitive',
}
const POSITION_MAP: Record<string, string> = {
  'Revés 🔵':  'reves',
  'Drive 🔴':  'drive',
  'Las dos 🟣': 'ambas',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
let msgId = 0
const nextId = () => ++msgId

function isValidEmail(v: string) {
  return v.includes('@') && v.includes('.')
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 ml-11 mt-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-[#F5F2EE]/40"
          style={{ animation: `inviteBounce 1s ${i * 0.2}s infinite` }}
        />
      ))}
      <style>{`
        @keyframes inviteBounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes inviteFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .msg-fadein { animation: inviteFadeUp 0.25s ease both; }
      `}</style>
    </div>
  )
}

// ── Bubbles ───────────────────────────────────────────────────────────────────

function AppBubble({ text }: { text: string }) {
  return (
    <div className="flex items-end gap-3 msg-fadein">
      <div className="w-8 h-8 rounded-full bg-[#1E1E1E] flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
          <path d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z" stroke="#E5352A" strokeWidth="2" />
          <path d="M8 12l2.5 2.5L16 9" stroke="#E5352A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="bg-[#1E1E1E] text-[#F5F2EE] rounded-2xl rounded-tl-sm px-4 py-3 max-w-xs text-sm leading-relaxed">
        {text}
      </div>
    </div>
  )
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end msg-fadein">
      <div className="bg-[#E5352A] text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-xs text-sm leading-relaxed">
        {text}
      </div>
    </div>
  )
}

// ── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({ data }: { data: Record<string, string> }) {
  return (
    <div className="ml-11 mt-2 msg-fadein">
      <div className="bg-[#1E1E1E] rounded-2xl p-4 text-sm space-y-1.5 max-w-xs">
        <p className="text-[#F5F2EE]">👤 {data.first_name} {data.last_name}</p>
        <p className="text-[#F5F2EE]">📍 {data.city}</p>
        <p className="text-[#F5F2EE]">🎾 {data.level_label}</p>
        <p className="text-[#F5F2EE]">🏓 {data.position_label}</p>
        <p className="text-[#F5F2EE]">✉️ {data.email}</p>
        {data.club_name && <p className="text-[#F5F2EE]">🏟️ {data.club_name}</p>}
      </div>
    </div>
  )
}

// ── Success screen ────────────────────────────────────────────────────────────

function SuccessScreen({ email }: { email: string }) {
  return (
    <div className="text-center mt-8 px-6 pb-12 msg-fadein">
      <div className="text-5xl mb-4">🎾</div>
      <p className="font-black text-4xl text-[#F5F2EE] uppercase leading-none">
        ¡Ya sos parte
        <br />de PASALA!
      </p>
      <p className="text-[#6B6965] text-sm mt-4">
        Revisá <span className="text-[#F5F2EE]/70">{email}</span> para activar tu cuenta.
      </p>
      <p className="text-[#6B6965] text-xs mt-1">Si no lo ves, revisá la carpeta de spam. 📬</p>
      <a
        href="https://wa.me/5492984315287"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 mt-6 bg-emerald-500 text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-emerald-400 transition-colors"
      >
        ¿Tenés dudas? Escribinos →
      </a>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function InviteChat({ token, intent, targetName, targetEmail, targetPlayer, customMessage }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>({ type: 'none' })
  const [textInput, setTextInput] = useState('')
  const [userData, setUserData] = useState<Record<string, string>>({})
  const [showSummary, setShowSummary] = useState(false)
  const [step, setStep] = useState<FlowStep>('chat')
  const [successEmail, setSuccessEmail] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const flowStarted = useRef(false)
  const optionCb = useRef<((opt: string) => void) | null>(null)
  const textCb = useRef<Record<string, (val: string) => void>>({})

  // ── Scroll & focus ─────────────────────────────────────────────────────────

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping, showSummary])

  useEffect(() => {
    if (inputMode.type === 'text' || inputMode.type === 'email') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [inputMode])

  // ── Msg helpers ────────────────────────────────────────────────────────────

  function addAppMsg(text: string) {
    setMessages((prev) => [...prev, { id: nextId(), role: 'app', text }])
  }
  function addUserMsg(text: string) {
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text }])
  }
  async function appSay(text: string, delay = 900) {
    setIsTyping(true)
    await sleep(delay)
    setIsTyping(false)
    addAppMsg(text)
  }

  // ── Callback helpers ───────────────────────────────────────────────────────

  function waitForOption(cb: (opt: string) => void) { optionCb.current = cb }
  function waitForText(field: string, cb: (val: string) => void) { textCb.current[field] = cb }

  function handleOptionSelect(opt: string) {
    const cb = optionCb.current
    optionCb.current = null
    setInputMode({ type: 'none' })
    cb?.(opt)
  }

  function handleTextSubmit() {
    const val = textInput.trim()
    if (!val) return
    const field = inputMode.type === 'text' || inputMode.type === 'email' ? inputMode.field : ''
    const cb = textCb.current[field]
    delete textCb.current[field]
    setTextInput('')
    setInputMode({ type: 'none' })
    cb?.(val)
  }

  // ── Complete registration ──────────────────────────────────────────────────

  async function doComplete(data: Record<string, string>, existingPlayerId?: string | null) {
    setIsTyping(true)
    try {
      await completeInviteRegistrationAction({
        token,
        userData: {
          first_name: data.first_name ?? '',
          last_name: data.last_name ?? '',
          city: data.city ?? '',
          category: data.category ?? 'beginner',
          position: data.position ?? 'reves',
          email: data.email ?? '',
          intent,
          existing_player_id: existingPlayerId ?? null,
          club_name: data.club_name,
          club_courts: data.club_courts,
          club_city: data.club_city,
        },
      })
      setIsTyping(false)
      addAppMsg('¡Listo! Tu perfil fue creado. 🎉')
      await sleep(700)
      addAppMsg(`Te enviamos un link a ${data.email} para activar tu cuenta.`)
      await sleep(700)
      addAppMsg('Revisá tu bandeja de entrada — si no lo ves, mirá en spam. 📬')
      setSuccessEmail(data.email)
      await sleep(800)
      setStep('done')
    } catch {
      setIsTyping(false)
      addAppMsg('Hubo un problema al crear tu perfil. ¿Querés intentarlo de nuevo?')
      setInputMode({ type: 'options', options: ['Intentar de nuevo'] })
      waitForOption(async () => {
        addUserMsg('Intentar de nuevo')
        setInputMode({ type: 'none' })
        await doComplete(data, existingPlayerId)
      })
    }
  }

  // ── Collect club data (club_owner) ─────────────────────────────────────────

  async function askClubData(base: Record<string, string>, existingPlayerId?: string | null) {
    await appSay('¿Cómo se llama tu club?', 700)
    setInputMode({ type: 'text', placeholder: 'Nombre del club...', field: 'club_name' })
    waitForText('club_name', async (club_name) => {
      addUserMsg(club_name)
      setInputMode({ type: 'none' })

      await appSay('¿Cuántas canchas tiene?', 700)
      setInputMode({ type: 'options', options: ['1', '2', '3', '4', '5 o más'] })
      waitForOption(async (club_courts) => {
        addUserMsg(club_courts)
        setInputMode({ type: 'none' })

        await appSay('¿En qué ciudad está el club?', 700)
        setInputMode({ type: 'text', placeholder: base.city || 'Ciudad del club...', field: 'club_city' })
        waitForText('club_city', async (club_city) => {
          addUserMsg(club_city)
          setInputMode({ type: 'none' })
          const final = { ...base, club_name, club_courts, club_city }
          setUserData(final)
          await showSummaryAndConfirm(final, existingPlayerId)
        })
      })
    })
  }

  // ── Summary + confirm ──────────────────────────────────────────────────────

  async function showSummaryAndConfirm(data: Record<string, string>, existingPlayerId?: string | null) {
    await appSay('Perfecto. Vamos a crear tu perfil con estos datos:', 700)
    setShowSummary(true)
    setUserData(data)
    await sleep(400)
    setInputMode({ type: 'options', options: ['Confirmar y crear mi perfil ✓', 'Corregir algo ✗'] })
    waitForOption(async (opt) => {
      addUserMsg(opt)
      setInputMode({ type: 'none' })
      setShowSummary(false)
      if (opt === 'Corregir algo ✗') {
        await appSay('Sin problema, empecemos de nuevo.', 500)
        await flowCollectAll({})
      } else {
        await doComplete(data, existingPlayerId)
      }
    })
  }

  // ── Collect all new user data ──────────────────────────────────────────────

  async function flowCollectAll(opts: {
    prefillFirstName?: string
    prefillLastName?: string
    prefillEmail?: string
    existingPlayerId?: string | null
    showIntro?: boolean
  }) {
    const { prefillFirstName, prefillLastName, prefillEmail, existingPlayerId, showIntro = false } = opts

    async function askLevel(base: Record<string, string>) {
      await appSay('¿Cuál es tu nivel de juego?', 700)
      setInputMode({ type: 'options', options: Object.keys(LEVEL_MAP) })
      waitForOption(async (level_label) => {
        addUserMsg(level_label)
        setInputMode({ type: 'none' })
        const category = LEVEL_MAP[level_label] ?? 'beginner'

        await appSay('¿En qué posición jugás habitualmente?', 700)
        setInputMode({ type: 'options', options: Object.keys(POSITION_MAP) })
        waitForOption(async (position_label) => {
          addUserMsg(position_label)
          setInputMode({ type: 'none' })
          const position = POSITION_MAP[position_label] ?? 'reves'
          const withLevel = { ...base, level_label, category, position_label, position }

          if (prefillEmail) {
            const final = { ...withLevel, email: prefillEmail }
            setUserData(final)
            if (intent === 'club_owner') {
              await askClubData(final, existingPlayerId)
            } else {
              await showSummaryAndConfirm(final, existingPlayerId)
            }
          } else {
            await appSay('¿Cuál es tu email? Te vamos a enviar un link para activar tu cuenta.', 700)
            setInputMode({ type: 'email', placeholder: 'tu@email.com', field: 'email' })
            waitForText('email', async (emailRaw) => {
              if (!isValidEmail(emailRaw)) {
                addUserMsg(emailRaw)
                setInputMode({ type: 'none' })
                await appSay('Ese email no parece válido. ¿Lo revisamos?', 500)
                setInputMode({ type: 'email', placeholder: 'tu@email.com', field: 'email' })
                waitForText('email', async (email) => {
                  addUserMsg(email)
                  setInputMode({ type: 'none' })
                  const final = { ...withLevel, email }
                  setUserData(final)
                  if (intent === 'club_owner') {
                    await askClubData(final, existingPlayerId)
                  } else {
                    await showSummaryAndConfirm(final, existingPlayerId)
                  }
                })
              } else {
                addUserMsg(emailRaw)
                setInputMode({ type: 'none' })
                const final = { ...withLevel, email: emailRaw }
                setUserData(final)
                if (intent === 'club_owner') {
                  await askClubData(final, existingPlayerId)
                } else {
                  await showSummaryAndConfirm(final, existingPlayerId)
                }
              }
            })
          }
        })
      })
    }

    async function askCity(base: Record<string, string>) {
      // Paso 3A — Provincia
      await appSay('¿En qué provincia estás?', 700)
      setInputMode({ type: 'options', options: Object.keys(PROVINCIAS_CIUDADES) })
      waitForOption(async (provincia) => {
        addUserMsg(provincia)
        setInputMode({ type: 'none' })

        // Paso 3B — Ciudad
        const ciudades = PROVINCIAS_CIUDADES[provincia] ?? []
        const opciones = provincia === 'Otra provincia'
          ? ['Otra ciudad']
          : [...ciudades, 'Otra ciudad']

        await appSay(`¿Y de qué ciudad de ${provincia}?`, 600)
        setInputMode({ type: 'options', options: opciones })
        waitForOption(async (ciudadOpt) => {
          addUserMsg(ciudadOpt)
          setInputMode({ type: 'none' })

          if (ciudadOpt === 'Otra ciudad') {
            await appSay('¿Cómo se llama tu ciudad?', 500)
            setInputMode({ type: 'text', placeholder: 'Tu ciudad...', field: 'city' })
            waitForText('city', async (city) => {
              addUserMsg(city)
              setInputMode({ type: 'none' })
              await askLevel({ ...base, provincia, city })
            })
          } else {
            await askLevel({ ...base, provincia, city: ciudadOpt })
          }
        })
      })
    }

    if (prefillFirstName && prefillLastName) {
      await askCity({ first_name: prefillFirstName, last_name: prefillLastName })
    } else {
      if (showIntro) await appSay('Sin problema. ¿Cómo te llamás?')
      else await appSay('¿Cómo te llamás?')
      setInputMode({ type: 'text', placeholder: 'Nombre y apellido...', field: 'fullname' })
      waitForText('fullname', async (fullname) => {
        addUserMsg(fullname)
        setInputMode({ type: 'none' })
        const parts = fullname.trim().split(' ')
        const first_name = parts[0] ?? fullname
        const last_name = parts.slice(1).join(' ') || ''
        await sleep(500)
        await appSay(`Buenísimo ${first_name}!`, 500)
        await askCity({ first_name, last_name })
      })
    }
  }

  // ── Confirmed existing player flows ───────────────────────────────────────

  async function flowConfirmedExisting(existingPlayerId: string, existingEmail: string) {
    if (intent === 'club_owner') {
      await appSay(`¡Perfecto! Para registrar tu club necesito algunos datos.`)
      // Still collect level/position for profile completeness then club data
      const firstName = targetPlayer?.first_name ?? ''
      const lastName = targetPlayer?.last_name ?? ''
      const city = targetPlayer?.city ?? ''
      await flowCollectAll({
        prefillFirstName: firstName,
        prefillLastName: lastName,
        prefillEmail: existingEmail || undefined,
        existingPlayerId,
      })
      return
    }

    await appSay(`¡Perfecto! Ya tenemos tus datos.`)
    await appSay(`¿Tu email es ${existingEmail}?`, 700)
    setInputMode({ type: 'options', options: ['Sí, ese es ✓', 'No, usar otro'] })
    waitForOption(async (opt) => {
      addUserMsg(opt)
      setInputMode({ type: 'none' })

      const useEmail = opt === 'No, usar otro' ? '' : existingEmail
      const firstName = targetPlayer?.first_name ?? ''
      const lastName = targetPlayer?.last_name ?? ''
      const city = targetPlayer?.city ?? ''

      if (opt === 'No, usar otro') {
        await flowCollectAll({
          prefillFirstName: firstName || undefined,
          prefillLastName: lastName || undefined,
          existingPlayerId,
        })
      } else {
        if (intent === 'coach') {
          await appSay('¡Genial! Vamos a activar tu perfil de entrenador. Necesito un par de datos más.', 700)
        }
        await flowCollectAll({
          prefillFirstName: firstName || undefined,
          prefillLastName: lastName || undefined,
          prefillEmail: useEmail || undefined,
          existingPlayerId,
        })
      }
    })
  }

  // ── Start flow ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (flowStarted.current) return
    flowStarted.current = true
    startFlow()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startFlow() {
    await appSay(`Hola${targetName ? ` ${targetName}` : ''}! 👋`, 600)
    await appSay('Somos PASALA, la plataforma de pádel de la Patagonia.')

    if (customMessage) {
      await appSay(customMessage)
    } else {
      const intentMsg: Record<Intent, string> = {
        new_player: 'Queremos ayudarte a llevar tu juego al siguiente nivel. 🎾',
        coach: 'Te invitamos a activar tu perfil de entrenador en PASALA.',
        club_owner: 'Te invitamos a registrar tu club en PASALA.',
      }
      await appSay(intentMsg[intent])
    }

    if (targetPlayer) {
      await appSay(
        `¿Sos ${targetPlayer.first_name} ${targetPlayer.last_name}${targetPlayer.city ? ` de ${targetPlayer.city}` : ''}?`,
        700
      )
      setInputMode({ type: 'options', options: ['Sí, soy yo ✓', 'No, soy otra persona'] })
      waitForOption(async (opt) => {
        addUserMsg(opt)
        setInputMode({ type: 'none' })
        if (opt === 'No, soy otra persona') {
          await flowCollectAll({ showIntro: true })
        } else {
          await flowConfirmedExisting(targetPlayer.id, targetEmail ?? '')
        }
      })
    } else {
      const parts = targetName ? targetName.trim().split(' ') : []
      await flowCollectAll({
        prefillFirstName: parts[0] || undefined,
        prefillLastName: parts.slice(1).join(' ') || undefined,
        prefillEmail: targetEmail ?? undefined,
      })
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0C0C0C] flex flex-col">
      {/* Header */}
      <div className="flex justify-center pt-8 pb-4 shrink-0">
        <PasalaLogo variant="dark" size="md" />
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="mx-auto max-w-lg space-y-3 pt-2">
          {messages.map((m) =>
            m.role === 'app' ? (
              <AppBubble key={m.id} text={m.text} />
            ) : (
              <UserBubble key={m.id} text={m.text} />
            )
          )}

          {isTyping && <TypingDots />}

          {/* Summary card */}
          {showSummary && !isTyping && <SummaryCard data={userData} />}

          {/* Options */}
          {!isTyping && inputMode.type === 'options' && (
            <div className="flex flex-wrap gap-2 ml-11 mt-2 msg-fadein">
              {inputMode.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleOptionSelect(opt)}
                  className="border border-white/20 text-[#F5F2EE] text-sm px-4 py-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Success screen */}
          {step === 'done' && <SuccessScreen email={successEmail} />}

          <div ref={endRef} />
        </div>
      </div>

      {/* Text input */}
      {step === 'chat' && !isTyping && (inputMode.type === 'text' || inputMode.type === 'email') && (
        <div className="shrink-0 px-4 pb-6 pt-2">
          <div className="mx-auto max-w-lg flex gap-2">
            <input
              ref={inputRef}
              type={inputMode.type === 'email' ? 'email' : 'text'}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
              placeholder={inputMode.placeholder}
              className="flex-1 bg-[#1E1E1E] border border-white/10 rounded-xl px-4 py-3 text-[#F5F2EE] text-sm placeholder:text-white/30 focus:border-[#E5352A] focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={handleTextSubmit}
              disabled={!textInput.trim()}
              className="bg-[#E5352A] rounded-xl px-4 py-3 text-white disabled:opacity-40 transition-opacity"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
