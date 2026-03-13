interface Badge {
  badge_key: string;
  unlocked_at: string;
}

interface BadgeDef {
  key: string;
  label: string;
  description: string;
  icon: string;
  color: string;
}

const BADGE_CATALOG: BadgeDef[] = [
  {
    key: "primer_partido",
    label: "Debut",
    description: "Primer partido cargado",
    icon: "DB",
    color: "bg-blue-50 border-blue-200",
  },
  {
    key: "primera_victoria",
    label: "Victoria",
    description: "Primera victoria registrada",
    icon: "V1",
    color: "bg-amber-50 border-amber-200",
  },
  {
    key: "racha_5",
    label: "Racha x5",
    description: "5 victorias consecutivas",
    icon: "R5",
    color: "bg-orange-50 border-orange-200",
  },
  {
    key: "racha_10",
    label: "Racha x10",
    description: "10 victorias consecutivas",
    icon: "R10",
    color: "bg-yellow-50 border-yellow-200",
  },
  {
    key: "50_partidos",
    label: "50 Partidos",
    description: "50 partidos jugados",
    icon: "50",
    color: "bg-emerald-50 border-emerald-200",
  },
  {
    key: "100_partidos",
    label: "Centenario",
    description: "100 partidos jugados",
    icon: "100",
    color: "bg-violet-50 border-violet-200",
  },
  {
    key: "elite_index",
    label: "Indice Elite",
    description: "PASALA index >= 70",
    icon: "IE",
    color: "bg-cyan-50 border-cyan-200",
  },
  {
    key: "evaluador",
    label: "Evaluado",
    description: "5+ evaluaciones tecnicas recibidas",
    icon: "EV",
    color: "bg-pink-50 border-pink-200",
  },
];

interface Props {
  badges: Badge[];
}

export function PlayerBadges({ badges }: Props) {
  const unlockedKeys = new Set(badges.map((b) => b.badge_key));
  const unlockedMap = new Map(badges.map((b) => [b.badge_key, b.unlocked_at]));

  return (
    <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
          Logros
        </h2>
        <span className="text-[10px] font-black text-blue-600">
          {unlockedKeys.size}/{BADGE_CATALOG.length}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {BADGE_CATALOG.map((def) => {
          const unlocked = unlockedKeys.has(def.key);
          const unlockedAt = unlockedMap.get(def.key);

          return (
            <div
              key={def.key}
              title={unlocked ? `${def.description}\n${unlockedAt}` : def.description}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-opacity ${
                unlocked ? def.color : "border-gray-100 bg-gray-50 opacity-35"
              }`}
            >
              <span className="text-sm font-black leading-none text-gray-700">{def.icon}</span>
              <span className="text-center text-[9px] font-black uppercase leading-tight tracking-wider text-gray-600">
                {def.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
