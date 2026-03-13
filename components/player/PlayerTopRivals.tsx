import { UserAvatar } from "@/components/ui/UserAvatar";

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
        <h2 className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-gray-400">
          Tus Rivales
        </h2>
        <p className="text-sm text-gray-400">
          Juega al menos 2 partidos contra el mismo rival para verlos aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-gray-400">
        Tus Rivales
      </h2>
      <div className="space-y-3">
        {rivals.map((r) => {
          const winColor =
            r.player_winrate >= 60
              ? "text-emerald-600"
              : r.player_winrate >= 40
              ? "text-blue-600"
              : "text-red-500";
          const avatarSrc = r.avatar_url?.startsWith("http") ? r.avatar_url : null;
          return (
            <div
              key={r.rival_id}
              className="flex items-center gap-3 rounded-2xl border border-gray-100 p-3"
            >
              <UserAvatar
                src={avatarSrc}
                initials={getInitials(r.display_name || "?")}
                size="sm"
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

