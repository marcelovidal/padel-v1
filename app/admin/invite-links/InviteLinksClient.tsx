"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Link2,
  Copy,
  Check,
  Plus,
  RefreshCw,
  Ban,
  X,
  ChevronDown,
} from "lucide-react";
import {
  createInviteLinkAction,
  deactivateInviteLinkAction,
  renewInviteLinkAction,
  searchPlayersForInviteAction,
  createUnclaimedPlayerAction,
} from "@/lib/actions/invite-links.actions";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

type RawLink = {
  id: string;
  token: string;
  intent: "new_player" | "coach" | "club_owner";
  target_name: string | null;
  target_email: string | null;
  custom_message: string | null;
  expires_at: string;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  created_at: string;
  created_by_player: { first_name: string; last_name: string } | null;
};

type PlayerResult = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  claimed: boolean;
  is_coach: boolean | null;
  is_club_owner: boolean | null;
};

interface Props {
  links: RawLink[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const INTENT_LABELS: Record<string, string> = {
  new_player: "Nuevo jugador",
  coach: "Entrenador",
  club_owner: "Dueño de club",
};

const INTENT_COLORS: Record<string, string> = {
  new_player: "bg-blue-100 text-blue-700",
  coach: "bg-purple-100 text-purple-700",
  club_owner: "bg-amber-100 text-amber-700",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function expiryLabel(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff < 0) return { label: "Vencido", cls: "text-red-600" };
  const days = Math.ceil(diff / 86_400_000);
  if (days <= 2) return { label: `Vence en ${days}d`, cls: "text-amber-600" };
  return { label: `Vence en ${days}d`, cls: "text-gray-500" };
}

function buildInviteUrl(token: string) {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return `${base}/invite/${token}`;
}

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(buildInviteUrl(token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copiar link"
      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

// ── getIntentWarning ──────────────────────────────────────────────────────────

function getIntentWarning(
  intent: "new_player" | "coach" | "club_owner",
  player: PlayerResult
): { text: string; ok: boolean } | null {
  if (intent === "new_player") {
    if (!player.claimed)
      return {
        ok: true,
        text: "Este jugador existe pero no completó su registro. La invitación lo guiará para activar su cuenta.",
      };
    return {
      ok: false,
      text: "Este jugador ya tiene cuenta activa. La invitación igualmente se enviará — puede usarse para actualizar sus datos.",
    };
  }
  if (intent === "coach") {
    if (player.is_coach)
      return { ok: false, text: "Este jugador ya tiene perfil de entrenador. Podés enviarle la invitación igual." };
    return { ok: true, text: "La invitación activará su perfil de entrenador." };
  }
  if (intent === "club_owner") {
    if (player.is_club_owner)
      return { ok: false, text: "Este jugador ya administra un club." };
    return { ok: true, text: "La invitación lo invitará a registrar su club." };
  }
  return null;
}

// ── PlayerSearchField ─────────────────────────────────────────────────────────

function PlayerSearchField({
  selected,
  onSelect,
}: {
  selected: PlayerResult | null;
  onSelect: (p: PlayerResult | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [open, setOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [searching, setSearching] = useState(false);

  // New player form state
  const [nfFirst, setNfFirst] = useState("");
  const [nfLast, setNfLast] = useState("");
  const [nfEmail, setNfEmail] = useState("");
  const [nfPhone, setNfPhone] = useState("");
  const [nfCity, setNfCity] = useState("");
  const [nfPending, nfStartTransition] = useTransition();
  const [nfError, setNfError] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      const data = await searchPlayersForInviteAction(query);
      setResults(data as PlayerResult[]);
      setOpen(true);
      setShowNewForm(false);
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  function initNewForm() {
    // Pre-fill name from query if it looks like a name
    const parts = query.trim().split(" ");
    setNfFirst(parts[0] ?? "");
    setNfLast(parts.slice(1).join(" ") ?? "");
    setNfEmail("");
    setNfPhone("");
    setNfCity("");
    setNfError(null);
    setShowNewForm(true);
  }

  function handleCreateNew() {
    if (!nfFirst.trim() || !nfLast.trim()) {
      setNfError("Nombre y apellido son obligatorios.");
      return;
    }
    setNfError(null);
    nfStartTransition(async () => {
      try {
        const p = await createUnclaimedPlayerAction({
          first_name: nfFirst.trim(),
          last_name: nfLast.trim(),
          email: nfEmail.trim() || undefined,
          phone: nfPhone.trim() || undefined,
          city: nfCity.trim() || undefined,
        });
        onSelect(p as PlayerResult);
        setQuery("");
        setOpen(false);
        setShowNewForm(false);
      } catch (e: unknown) {
        setNfError(e instanceof Error ? e.message : "Error al crear jugador");
      }
    });
  }

  function playerFullName(p: PlayerResult) {
    return p.display_name ||
      `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() ||
      "(sin nombre)";
  }

  function playerInitials(p: PlayerResult) {
    const name = playerFullName(p);
    return name.slice(0, 2).toUpperCase();
  }

  // ── Selected card ──────────────────────────────────────────────────────────
  if (selected) {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-stone-50 border border-stone-200 p-3">
        <div className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-black shrink-0">
          {playerInitials(selected)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">{playerFullName(selected)}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {selected.city && <span className="text-xs text-gray-500">{selected.city}</span>}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${selected.claimed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {selected.claimed ? "Reclamado" : "Sin reclamar"}
            </span>
            {selected.is_coach && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700">Entrenador</span>}
            {selected.is_club_owner && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700">Club owner</span>}
          </div>
          {selected.email && <p className="text-xs text-gray-400 mt-0.5">{selected.email}</p>}
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-gray-400 hover:text-gray-600 p-1 shrink-0"
          title="Quitar destinatario"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ── Search input + dropdown ────────────────────────────────────────────────
  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Buscar jugador por nombre, email o teléfono..."
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
      {searching && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
          Buscando...
        </div>
      )}

      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          {results.length > 0 ? (
            <ul>
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => { onSelect(p); setQuery(""); setOpen(false); }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-black shrink-0">
                      {playerInitials(p)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{playerFullName(p)}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {p.city && <span className="text-xs text-gray-400">{p.city}</span>}
                        <span className={`rounded-full px-1.5 py-0 text-[10px] font-bold ${p.claimed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {p.claimed ? "Reclamado" : "Sin reclamar"}
                        </span>
                        {p.is_coach && <span className="rounded-full px-1.5 py-0 text-[10px] font-bold bg-blue-100 text-blue-700">Entrenador</span>}
                        {p.is_club_owner && <span className="rounded-full px-1.5 py-0 text-[10px] font-bold bg-purple-100 text-purple-700">Club owner</span>}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-sm text-gray-400">Sin resultados.</p>
          )}

          {/* Create new */}
          {!showNewForm ? (
            <div className="border-t border-gray-100">
              <button
                type="button"
                onClick={initNewForm}
                className="w-full px-3 py-2.5 text-left text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
              >
                + Crear nuevo jugador con estos datos
              </button>
            </div>
          ) : (
            <div className="border-t border-gray-100 p-3 space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nuevo jugador</p>
              <div className="grid grid-cols-2 gap-2">
                <input value={nfFirst} onChange={(e) => setNfFirst(e.target.value)} placeholder="Nombre*"
                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none" />
                <input value={nfLast} onChange={(e) => setNfLast(e.target.value)} placeholder="Apellido*"
                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none" />
              </div>
              <input value={nfEmail} onChange={(e) => setNfEmail(e.target.value)} placeholder="Email" type="email"
                className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <input value={nfPhone} onChange={(e) => setNfPhone(e.target.value)} placeholder="WhatsApp"
                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none" />
                <input value={nfCity} onChange={(e) => setNfCity(e.target.value)} placeholder="Ciudad"
                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none" />
              </div>
              {nfError && <p className="text-xs text-red-600">{nfError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateNew}
                  disabled={nfPending}
                  className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {nfPending ? "Creando..." : "Crear y seleccionar"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── NewLinkModal ──────────────────────────────────────────────────────────────

function NewLinkModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [intent, setIntent] = useState<"new_player" | "coach" | "club_owner">("new_player");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerResult | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [expiresDays, setExpiresDays] = useState(7);
  const [maxUses, setMaxUses] = useState<number | null>(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const warning = selectedPlayer ? getIntentWarning(intent, selectedPlayer) : null;

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await createInviteLinkAction({
          intent,
          target_player_id: selectedPlayer?.id,
          target_name: selectedPlayer
            ? `${selectedPlayer.first_name ?? ""} ${selectedPlayer.last_name ?? ""}`.trim() || undefined
            : undefined,
          target_email: selectedPlayer?.email ?? undefined,
          target_phone: selectedPlayer?.phone ?? undefined,
          custom_message: customMessage.trim() || undefined,
          expires_days: expiresDays,
          max_uses: maxUses,
          created_by: "",
        });
        onCreated();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error al crear el link");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <p className="font-black text-gray-900">Nuevo invite link</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {/* Intent */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Tipo de onboarding
            </label>
            <div className="flex gap-2">
              {(
                [
                  ["new_player", "Jugador"],
                  ["coach", "Entrenador"],
                  ["club_owner", "Club"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setIntent(val)}
                  className={`flex-1 rounded-xl border py-2 text-sm font-bold transition-colors ${
                    intent === val
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Destinatario */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Destinatario{" "}
              <span className="font-normal normal-case text-gray-400">(opcional)</span>
            </label>
            <PlayerSearchField selected={selectedPlayer} onSelect={setSelectedPlayer} />
            {warning && (
              <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
                warning.ok
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-amber-50 border-amber-200 text-amber-700"
              }`}>
                <span className="shrink-0 mt-0.5">{warning.ok ? "✅" : "⚠️"}</span>
                <span>{warning.text}</span>
              </div>
            )}
          </div>

          {/* Mensaje personalizado */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Mensaje personalizado{" "}
              <span className="font-normal normal-case text-gray-400">
                (opcional)
              </span>
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={2}
              placeholder="Ej: Te invito a unirte a la plataforma PASALA..."
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Vigencia y usos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Vigencia
              </label>
              <div className="relative">
                <select
                  value={expiresDays}
                  onChange={(e) => setExpiresDays(Number(e.target.value))}
                  className="w-full appearance-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {[1, 3, 7, 14, 30, 90].map((d) => (
                    <option key={d} value={d}>
                      {d} {d === 1 ? "día" : "días"}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Usos máx.
              </label>
              <div className="relative">
                <select
                  value={maxUses ?? ""}
                  onChange={(e) =>
                    setMaxUses(
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                  className="w-full appearance-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value={1}>1 uso</option>
                  <option value={5}>5 usos</option>
                  <option value={10}>10 usos</option>
                  <option value={50}>50 usos</option>
                  <option value="">Sin límite</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Creando..." : "Crear link"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function InviteLinksClient({ links }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const active = links.filter((l) => l.is_active);
  const inactive = links.filter((l) => !l.is_active);

  function handleCreated() {
    setShowModal(false);
    router.refresh();
  }

  function handleDeactivate(id: string) {
    setPendingId(id);
    startTransition(async () => {
      await deactivateInviteLinkAction(id);
      setPendingId(null);
      router.refresh();
    });
  }

  function handleRenew(id: string, days: number) {
    setPendingId(id);
    startTransition(async () => {
      await renewInviteLinkAction(id, days);
      setPendingId(null);
      router.refresh();
    });
  }

  function LinkRow({ link }: { link: RawLink }) {
    const expiry = expiryLabel(link.expires_at);
    const isExpired = new Date(link.expires_at) < new Date();
    const busy = isPending && pendingId === link.id;

    return (
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex flex-col md:flex-row md:items-center gap-3">
        {/* Left: intent + target */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${INTENT_COLORS[link.intent] ?? "bg-gray-100 text-gray-600"}`}
            >
              {INTENT_LABELS[link.intent] ?? link.intent}
            </span>
            {link.is_active ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                Activo
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500">
                Inactivo
              </span>
            )}
          </div>

          <p className="text-sm font-semibold text-gray-900 truncate">
            {link.target_name ?? (
              <span className="font-normal text-gray-400 italic">
                Link genérico
              </span>
            )}
            {link.target_email && (
              <span className="ml-1.5 text-xs font-normal text-gray-500">
                · {link.target_email}
              </span>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <span className={expiry.cls}>{expiry.label}</span>
            <span>
              {link.use_count}/{link.max_uses ?? "∞"} usos
            </span>
            <span>Creado {fmtDate(link.created_at)}</span>
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
              {link.token.slice(0, 8)}…
            </code>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex flex-wrap gap-2 shrink-0">
          {link.is_active && <CopyButton token={link.token} />}

          {isExpired && link.is_active && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleRenew(link.id, 7)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                +7d
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleRenew(link.id, 30)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                +30d
              </button>
            </>
          )}

          {!isExpired && link.is_active && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleRenew(link.id, 30)}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Renovar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDeactivate(link.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                <Ban className="h-3.5 w-3.5" />
                Desactivar
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {showModal && (
        <NewLinkModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}

      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Link2 className="h-6 w-6 text-blue-600" />
              Invite Links
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Links de onboarding personalizados para nuevos usuarios.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuevo link
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total", value: links.length },
            { label: "Activos", value: active.length },
            {
              label: "Usos totales",
              value: links.reduce((s, l) => s + l.use_count, 0),
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-center"
            >
              <p className="text-2xl font-black text-gray-900">{value}</p>
              <p className="mt-0.5 text-xs font-semibold text-gray-500">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Active links */}
        <section className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">
            Activos ({active.length})
          </h2>
          {active.length === 0 ? (
            <p className="text-sm text-gray-400">No hay links activos.</p>
          ) : (
            <div className="space-y-2">
              {active.map((l) => (
                <LinkRow key={l.id} link={l} />
              ))}
            </div>
          )}
        </section>

        {/* Inactive links */}
        {inactive.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">
              Inactivos / vencidos ({inactive.length})
            </h2>
            <div className="space-y-2">
              {inactive.map((l) => (
                <LinkRow key={l.id} link={l} />
              ))}
            </div>
          </section>
        )}

        {links.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
            <Link2 className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="font-semibold text-gray-500">
              Todavía no hay invite links
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Creá el primero con el botón de arriba.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
