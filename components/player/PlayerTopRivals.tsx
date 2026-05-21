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
      <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
        <svg className="h-4 w-4 text-brand-rojo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-gris-mid">
          Tus Rivales
        </h2>
      </div>
        <p className="text-sm text-brand-gris-mid">
          Juega al menos 2 partidos contra el mismo rival para verlos aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-brand-rojo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-gris-mid">Tus Rivales</h2>
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
              className="flex items-center gap-3 rounded-2xl border border-gray-100 p-3"
            >
              <UserAvatar
                src={avatarSrc}
                initials={getInitials(r.display_name || "?")}
                size="sm"
                className={!avatarSrc ? colorClass : ""}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">{r.display_name}</p>
                <p className="text-[10px] text-gray-400">
                  {r.matches_played} PJ · {r.player_wins}G / {r.rival_wins}P
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-black ${winColor}`}>{r.player_winrate}%</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">WR</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

