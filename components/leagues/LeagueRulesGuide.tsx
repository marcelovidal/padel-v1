export function LeagueRulesGuide() {
  return (
    <details className="group rounded-2xl border bg-white">
      <summary className="flex cursor-pointer select-none list-none items-center justify-between rounded-2xl p-4 hover:bg-gray-50">
        <span className="text-sm font-black uppercase tracking-wider text-gray-600">¿Cómo funciona una liga?</span>
        <span className="text-xs text-gray-400 transition-transform group-open:rotate-180">▾</span>
      </summary>

      <div className="px-4 pb-4">
      <p className="mb-3 text-sm text-gray-600">
        Lee esta guia antes de crear una liga. Define como se organiza la competencia y que condiciones deben cumplirse.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
          <p className="text-sm font-semibold text-blue-900">Flujo de gestion</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-blue-900">
            <li>Crear liga y divisiones.</li>
            <li>Inscribir parejas por division.</li>
            <li>Armar grupos y generar fixture.</li>
            <li>Programar cruces en canchas.</li>
            <li>Cargar resultados.</li>
            <li>Generar playoffs cuando grupos esten completos.</li>
          </ol>
        </div>

        <div className="rounded-xl border border-gray-100 p-3">
          <p className="text-sm font-semibold text-gray-900">Reglas de tabla</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
            <li>Victoria: 3 puntos.</li>
            <li>Desempate: puntos, victorias, sets ganados, sets perdidos, ultimo partido.</li>
            <li>Para cerrar grupos, todos los cruces deben tener resultado.</li>
          </ul>
        </div>

        <div className="rounded-xl border border-gray-100 p-3">
          <p className="text-sm font-semibold text-gray-900">Playoffs (MVP actual)</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
            <li>Soporta divisiones con 1, 2 o 4 grupos.</li>
            <li>Clasifican 2 equipos por grupo.</li>
            <li>1 grupo: final. 2 grupos: semifinales + final. 4 grupos: cuartos + semifinales + final.</li>
            <li>El ganador avanza automaticamente al siguiente cruce.</li>
          </ul>
        </div>

        <div className="rounded-xl border border-gray-100 p-3">
          <p className="text-sm font-semibold text-gray-900">Agenda y resultados</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
            <li>Programar un partido genera o actualiza la reserva de cancha.</li>
            <li>Se bloquean solapes de cancha y de jugadores.</li>
            <li>El resultado se carga una sola vez por partido y solo cuando esta finalizado.</li>
          </ul>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Esta misma seccion puede reutilizarse en la vista de jugadores en una etapa posterior.
      </p>
      </div>
    </details>
  );
}

