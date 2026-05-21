'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PasalaLogo } from '@/components/ui/PasalaLogo'
import { Send } from 'lucide-react'

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
let msgId = 0
const nextId = () => ++msgId

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 ml-11 mt-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-[#F5F2EE]/40"
          style={{
            animation: `inviteBounce 1s ${i * 0.2}s infinite`,
          }}
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

// ── App bubble ────────────────────────────────────────────────────────────────

function AppBubble({ text }: { text: string }) {
  return (
    <div className="flex items-end gap-3 msg-fadein">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-[#1E1E1E] flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
          <path
            d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z"
            stroke="#E5352A"
            strokeWidth="2"
          />
          <path d="M8 12l2.5 2.5L16 9" stroke="#E5352A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="bg-[#1E1E1E] text-[#F5F2EE] rounded-2xl rounded-tl-sm px-4 py-3 max-w-xs text-sm leading-relaxed">
        {text}
      </div>
    </div>
  )
}

// ── User bubble ───────────────────────────────────────────────────────────────

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end msg-fadein">
      <div className="bg-[#E5352A] text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-xs text-sm leading-relaxed">
        {text}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function InviteChat({
  token,
  intent,
  targetName,
  targetEmail,
  targetPlayer,
  customMessage,
}: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>({ type: 'none' })
  const [textInput, setTextInput] = useState('')
  const [userData, setUserData] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const flowStarted = useRef(false)

  // ── Scroll to bottom ───────────────────────────────────────────────────────

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // ── Focus input when it appears ────────────────────────────────────────────

  useEffect(() => {
    if (inputMode.type === 'text' || inputMode.type === 'email') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [inputMode])

  // ── Helpers ────────────────────────────────────────────────────────────────

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

  async function markUsed() {
    try {
      await fetch(`/api/invite/${token}/use`, { method: 'POST' })
    } catch {
      // non-critical
    }
  }

  function redirectTo(path: string) {
    setDone(true)
    setTimeout(() => router.push(path), 600)
  }

  // ── FLUJO A — new_player confirmado ────────────────────────────────────────

  async function flowA_newPlayer(email: string) {
    await appSay('¡Perfecto! Ya tenés un perfil en PASALA.')
    await appSay('¿Querés completar tu registro y empezar a jugar?', 700)
    setInputMode({
      type: 'options',
      options: ['Sí, quiero registrarme', 'Más información'],
    })
    waitForOption(async (opt) => {
      addUserMsg(opt)
      setInputMode({ type: 'none' })
      if (opt === 'Más información') {
        await appSay('PASALA es la plataforma de pádel de la Patagonia. Podés registrar partidos, ver tu ranking, buscar rivales y más.')
        await appSay('¿Te animás a crear tu cuenta?', 700)
        setInputMode({ type: 'options', options: ['Sí, registrarme', 'Más tarde'] })
        waitForOption(async (opt2) => {
          addUserMsg(opt2)
          setInputMode({ type: 'none' })
          if (opt2 === 'Más tarde') {
            await appSay('Sin problema. Cuando quieras, el link sigue disponible. 👋')
          } else {
            await finishRegistration(email)
          }
        })
      } else {
        await finishRegistration(email)
      }
    })
  }

  // ── FLUJO B — coach ────────────────────────────────────────────────────────

  async function flowB_coach(email: string) {
    await appSay('Como entrenador vas a poder gestionar tus alumnos, publicar tus clases y hacer seguimiento de su evolución. 📊')
    await appSay('¿Querés activar tu perfil de entrenador?', 700)
    setInputMode({ type: 'options', options: ['Sí, activar mi perfil', 'Contame más'] })
    waitForOption(async (opt) => {
      addUserMsg(opt)
      setInputMode({ type: 'none' })
      if (opt === 'Contame más') {
        await appSay('Podés vincular alumnos, asignar desafíos, ver su Índice PASALA y gestionar tu agenda de clases.')
        await appSay('Todo desde la app, sin papeles ni grupos de WhatsApp.', 700)
        setInputMode({ type: 'options', options: ['Sí, activar mi perfil', 'Más tarde'] })
        waitForOption(async (opt2) => {
          addUserMsg(opt2)
          setInputMode({ type: 'none' })
          if (opt2 === 'Más tarde') {
            await appSay('Cuando quieras, el link sigue disponible. 👋')
          } else {
            await finishCoach(email)
          }
        })
      } else {
        await finishCoach(email)
      }
    })
  }

  async function finishCoach(email: string) {
    await appSay('¡Genial! Completá tu registro y activamos tu perfil de entrenador.')
    await markUsed()
    redirectTo(`/welcome?email=${encodeURIComponent(email)}&role=coach`)
  }

  // ── FLUJO C — club_owner ───────────────────────────────────────────────────

  async function flowC_club(email: string) {
    await appSay('Con PASALA podés gestionar reservas, turnos fijos, torneos y ligas desde un solo panel. 🏟️')
    await appSay('Tus jugadores ya usan la app — solo necesitás registrar tu club.', 700)
    setInputMode({ type: 'options', options: ['Registrar mi club', 'Ver cómo funciona'] })
    waitForOption(async (opt) => {
      addUserMsg(opt)
      setInputMode({ type: 'none' })
      if (opt === 'Ver cómo funciona') {
        await appSay('Agenda semanal por cancha, turnos fijos automáticos, bracket de torneos y métricas en tiempo real.')
        await appSay('¿Te convenciste? 😄', 700)
        setInputMode({ type: 'options', options: ['Sí, registrar mi club', 'Tengo dudas'] })
        waitForOption(async (opt2) => {
          addUserMsg(opt2)
          setInputMode({ type: 'none' })
          if (opt2 === 'Tengo dudas') {
            await appSay('Sin problema. Podés hablar con nosotros directamente por WhatsApp.')
            setInputMode({
              type: 'options',
              options: ['Escribirnos →'],
            })
            waitForOption(async () => {
              addUserMsg('Escribirnos →')
              setInputMode({ type: 'none' })
              window.open('https://wa.me/5492984315287', '_blank')
            })
          } else {
            await finishClub(email)
          }
        })
      } else {
        await finishClub(email)
      }
    })
  }

  async function finishClub(email: string) {
    await appSay('Perfecto. Primero necesitamos que crees tu cuenta como jugador.')
    await markUsed()
    redirectTo(`/welcome?email=${encodeURIComponent(email)}&role=club_owner`)
  }

  async function finishRegistration(email: string) {
    await appSay('¡Genial! Te llevamos al registro ahora.')
    await markUsed()
    redirectTo(`/welcome?email=${encodeURIComponent(email)}`)
  }

  // ── FLUJO 2 — nuevo usuario ────────────────────────────────────────────────

  async function flowNewUser() {
    await appSay('Sin problema. ¿Cómo te llamás?')
    setInputMode({ type: 'text', placeholder: 'Tu nombre...', field: 'name' })
    waitForText('name', async (name) => {
      addUserMsg(name)
      setInputMode({ type: 'none' })
      setUserData((p) => ({ ...p, name }))

      await appSay(`Hola ${name}! ¿De qué ciudad jugás?`, 700)
      setInputMode({ type: 'text', placeholder: 'Tu ciudad...', field: 'city' })
      waitForText('city', async (city) => {
        addUserMsg(city)
        setInputMode({ type: 'none' })
        setUserData((p) => ({ ...p, city }))

        await appSay('¿Cuál es tu nivel aproximado?', 700)
        setInputMode({
          type: 'options',
          options: ['Principiante', 'Intermedio', 'Avanzado', 'Competitivo'],
        })
        waitForOption(async (level) => {
          addUserMsg(level)
          setInputMode({ type: 'none' })
          setUserData((p) => ({ ...p, level }))

          await appSay('¿Cuál es tu email?', 700)
          setInputMode({ type: 'email', placeholder: 'tu@email.com', field: 'email' })
          waitForText('email', async (email) => {
            addUserMsg(email)
            setInputMode({ type: 'none' })

            await appSay(`Perfecto ${name}. Todo listo para crear tu cuenta. 🎾`, 700)
            await markUsed()
            redirectTo(
              `/welcome?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&city=${encodeURIComponent(city)}`
            )
          })
        })
      })
    })
  }

  // ── Callback helpers ───────────────────────────────────────────────────────
  // Usamos refs para que los callbacks puedan ser reemplazados sin re-render

  const optionCb = useRef<((opt: string) => void) | null>(null)
  const textCb = useRef<Record<string, (val: string) => void>>({})

  function waitForOption(cb: (opt: string) => void) {
    optionCb.current = cb
  }

  function waitForText(field: string, cb: (val: string) => void) {
    textCb.current[field] = cb
  }

  function handleOptionSelect(opt: string) {
    const cb = optionCb.current
    optionCb.current = null
    setInputMode({ type: 'none' })
    cb?.(opt)
  }

  function handleTextSubmit() {
    const val = textInput.trim()
    if (!val) return
    const field = inputMode.type === 'text' || inputMode.type === 'email'
      ? inputMode.field
      : ''
    const cb = textCb.current[field]
    delete textCb.current[field]
    setTextInput('')
    setInputMode({ type: 'none' })
    cb?.(val)
  }

  // ── Start flow (once) ──────────────────────────────────────────────────────

  useEffect(() => {
    if (flowStarted.current) return
    flowStarted.current = true
    startFlow()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startFlow() {
    // Greeting
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

    // Confirm identity if target player is known
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
          await flowNewUser()
        } else {
          const email = targetEmail ?? ''
          if (intent === 'coach') await flowB_coach(email)
          else if (intent === 'club_owner') await flowC_club(email)
          else await flowA_newPlayer(email)
        }
      })
    } else {
      // Generic link — go straight to new user flow or intent flow
      if (intent === 'coach') {
        await flowNewUser()
      } else if (intent === 'club_owner') {
        await flowC_club('')
      } else {
        await flowNewUser()
      }
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

          {/* Option buttons */}
          {!isTyping && inputMode.type === 'options' && (
            <div className="flex flex-wrap gap-2 ml-11 mt-2 msg-fadein">
              {inputMode.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleOptionSelect(opt)}
                  className="border border-white/20 text-[#F5F2EE] text-sm px-4 py-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* Text input */}
      {!isTyping && (inputMode.type === 'text' || inputMode.type === 'email') && (
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

      {/* Redirect overlay */}
      {done && (
        <div className="fixed inset-0 bg-[#0C0C0C] flex items-center justify-center z-50">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#E5352A]/20 flex items-center justify-center mx-auto">
              <div className="w-5 h-5 rounded-full bg-[#E5352A] animate-ping" />
            </div>
            <p className="text-[#F5F2EE] text-sm">Redirigiendo...</p>
          </div>
        </div>
      )}
    </div>
  )
}
