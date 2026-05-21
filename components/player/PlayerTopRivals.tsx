import { UserAvatar } from "@/components/ui/UserAvatar";
import Link from "next/link";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

interface Rival {
  rival_id: string;
  display_name: string;
  avatar_url: string | null;
  matches_played: number;
  player_wins: number;
  rival_wins: number;
  player_winrate: number;
}

interface Props {
  rivals: Rival[];
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function PlayerTopRivals({ rivals }: Props) {
  if (rivals.length === 0) {
    return (
      <div className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--bg-card)] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.07)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-brand-rojo/10">
            <svg className="h-3 w-3 text-brand-rojo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Tus Rivales</h2>
        </div>
        <p className="text-sm text-brand-gris-mid">
          Juega al menos 2 partidos contra el mismo rival para verlos aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--bg-card)] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.07)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-brand-rojo/10">
            <svg className="h-3 w-3 text-brand-rojo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Tus Rivales</h2>
        </div>
        <Link href="/player/players" className="text-[10px] font-black uppercase tracking-widest text-brand-azul hover:text-brand-azul/80">
          Ver todos →
        </Link>
      </div>
      <div className="space-y-3">
        {rivals.map((r) => {
          const winColor =
            r.player_winrate >= 60
              ? "text-emerald-600"
              : r.player_winrate >= 40
              ? "text-brand-azul"
              : "text-brand-rojo";
          const avatarSrc = r.avatar_url?.startsWith("http") ? r.avatar_url : null;
          const colorClass = avatarColor(r.display_name || "");
          return (
            <div
              key={r.rival_id}
              className="flex items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] p-3"
            >
              <UserAvatar
                src={avatarSrc}
                initials={getInitials(r.display_name || "?")}
                size="sm"
                className={!avatarSrc ? colorClass : ""}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[var(--text-primary)]">{r.display_name}</p>
                <p className="text-[10px] text-[var(--text-faint)]">
                  {r.matches_played} PJ · {r.player_wins}G / {r.rival_wins}P
                </p>
              </div>
              <div className="text-right">
                <p className={`font-display text-[22px] font-black leading-none tabular-nums ${winColor}`}>{r.player_winrate}%</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--text-faint)]">WR</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

