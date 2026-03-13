import Link from "next/link";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { MapPin, Trophy, Activity } from "lucide-react";

export interface DirectoryPlayer {
  id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  region_name: string | null;
  category: number | null;
  position: string | null;
  pasala_index: number | null;
  is_guest: boolean;
  user_id: string | null;
  played: number;
  wins: number;
  win_rate: number;
  activity_badge: "new" | "hot" | "active" | "occasional" | "inactive";
  is_same_city: boolean;
}

const ACTIVITY_CONFIG = {
  hot:        { label: "En racha",   bg: "bg-amber-500/20",   text: "text-amber-300",  border: "border-amber-500/30",  dot: "bg-amber-400"  },
  active:     { label: "Activo",     bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  occasional: { label: "Ocasional",  bg: "bg-blue-500/20",    text: "text-blue-300",   border: "border-blue-500/30",   dot: "bg-blue-400"   },
  new:        { label: "Nuevo",      bg: "bg-cyan-500/20",    text: "text-cyan-300",   border: "border-cyan-500/30",   dot: "bg-cyan-400"   },
  inactive:   { label: "Inactivo",   bg: "bg-white/5",        text: "text-white/40",   border: "border-white/10",      dot: "bg-white/20"   },
} as const;

const LEVEL_CONFIG: Array<{ min: number; label: string; color: string }> = [
  { min: 75, label: "Elite",       color: "text-amber-400"   },
  { min: 65, label: "Experto",     color: "text-violet-400"  },
  { min: 55, label: "Avanzado",    color: "text-cyan-400"    },
  { min: 45, label: "Intermedio",  color: "text-emerald-400" },
  { min: 30, label: "Amateur",     color: "text-blue-300"    },
  { min: 0,  label: "Principiante",color: "text-blue-300/60" },
];

function getLevelInfo(index: number | null) {
  if (index === null) return { label: "Sin índice", color: "text-blue-300/40" };
  return LEVEL_CONFIG.find((l) => index >= l.min) ?? LEVEL_CONFIG[LEVEL_CONFIG.length - 1];
}

interface PlayerDirectoryCardProps {
  player: DirectoryPlayer;
  viewerId?: string;
  /** Extra action rendered below the card footer (e.g. Invite button) */
  extraAction?: React.ReactNode;
}

export function PlayerDirectoryCard({ player, viewerId, extraAction }: PlayerDirectoryCardProps) {
  const {
    id, display_name, avatar_url, city, region_name, category,
    pasala_index, played, wins, win_rate, activity_badge, is_same_city, user_id,
  } = player;

  const level    = getLevelInfo(pasala_index);
  const activity = ACTIVITY_CONFIG[activity_badge];
  const initials = display_name?.slice(0, 2).toUpperCase() ?? "??";
  const isMe     = !!viewerId && user_id === viewerId;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 p-4 text-white shadow-lg shadow-blue-950/40 hover:shadow-xl hover:shadow-blue-900/50 transition-all group">
      {/* Decorative blob */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-700/15 blur-2xl" />

      {/* PASALA index – top right */}
      <div className="absolute top-3.5 right-4 flex flex-col items-center leading-none">
        <span className="text-2xl font-black tabular-nums">
          {pasala_index !== null ? Math.round(pasala_index) : "—"}
        </span>
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-400/50 mt-0.5">
          PASALA
        </span>
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-3 pr-14">
        <div className="relative flex-shrink-0">
          <UserAvatar
            src={avatar_url?.startsWith("http") ? avatar_url : null}
            initials={initials}
            size="md"
            className="ring-2 ring-white/10"
          />
          {is_same_city && (
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-blue-950" title="Tu ciudad" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-black text-white truncate leading-tight">{display_name}</h3>
            {isMe && (
              <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">
                Tú
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            {(city || region_name) && (
              <>
                <MapPin className="h-3 w-3 text-blue-400/50 flex-shrink-0" />
                <span className="text-[11px] text-blue-300/60 truncate">
                  {city || region_name}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Level + Activity badges */}
      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
        <span className={`text-[10px] font-black uppercase tracking-widest ${level.color}`}>
          {level.label}
        </span>
        {category != null && (
          <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-black text-blue-200">
            {category}ª
          </span>
        )}
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${activity.bg} ${activity.text} ${activity.border}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${activity.dot}`} />
          {activity.label}
        </span>
      </div>

      {/* Stats row */}
      <div className="mt-2.5 flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Activity className="h-3 w-3 text-blue-400/50" />
          <span className="text-[11px] font-bold text-blue-200/70">
            {played} <span className="font-medium text-blue-400/50">PJ</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Trophy className="h-3 w-3 text-blue-400/50" />
          <span className="text-[11px] font-bold text-blue-200/70">
            {wins} <span className="font-medium text-blue-400/50">G</span>
          </span>
        </div>
        {played > 0 && (
          <span className="text-[11px] font-bold text-blue-200/70">
            {win_rate}% <span className="font-medium text-blue-400/50">WR</span>
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-white/8 flex items-center gap-2">
        <Link
          href={`/p/${id}`}
          className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-200 hover:bg-white/15 transition-colors"
        >
          Ver perfil
        </Link>
        {extraAction}
      </div>
    </div>
  );
}
