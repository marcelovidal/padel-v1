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
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-brand-rojo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
          </svg>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-gris-mid">Logros</h2>
        </div>
        <span className="text-[10px] font-black text-brand-azul">
          {unlockedKeys.size} / {BADGE_CATALOG.length} desbloqueados
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
