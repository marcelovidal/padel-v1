"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Slides del carrusel
// ─────────────────────────────────────────────────────────────────────────────

const SLIDE_TEXT = [
  {
    title: "Una vista completa de tu club, en tiempo real.",
    desc: "Reservas, jugadores activos, hora pico y últimos partidos. Todo en un panel pensado para que tomes decisiones rápido.",
  },
  {
    title: "Administrá tus turnos sin llamadas ni papel.",
    desc: "Visualizá toda la semana por cancha. Confirmá reservas, identificá horarios libres y gestioná solicitudes pendientes.",
  },
  {
    title: "Tus jugadores frecuentes, siempre en su lugar.",
    desc: "Asigná turnos recurrentes semanales por jugador y cancha. Se repiten automáticamente, vos solo administrás las excepciones.",
  },
  {
    title: "Creá torneos y ligas. Tus jugadores se inscriben desde la app.",
    desc: "Organizá la competencia de tu club sin planillas. Los jugadores ven los eventos, se inscriben y siguen su posición en tiempo real.",
  },
  {
    title: "Las llaves se generan solas.",
    desc: "Cargá los inscriptos y PASALA arma el bracket automáticamente. Resultados, cruces y avance de ronda, todo desde el panel.",
  },
  {
    title: "El ranking de tu club, siempre actualizado.",
    desc: "Cada partido registrado impacta en el Índice PASALA de tus jugadores. Tu club tiene su propio ranking en tiempo real.",
  },
  {
    title: "También podés gestionar los entrenadores de tu club.",
    desc: "Vinculá entrenadores, habilitá reservas de clases y conectalos con tus jugadores. Un diferencial que pocos clubes ofrecen.",
  },
];

const SLIDES = [

  // ── 0: Panel del Club — resumen ejecutivo ─────────────────────────────────
  <>
    <div className="flex items-center gap-3 bg-[#1a2942] px-4 py-3">
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-3 rounded-full bg-red-400" />
        <div className="h-3 w-3 rounded-full bg-amber-400" />
        <div className="h-3 w-3 rounded-full bg-emerald-400" />
      </div>
      <div className="mx-4 flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0f1e35] px-3 py-1.5">
        <svg viewBox="0 0 12 14" className="h-3 w-2.5 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="5" width="10" height="8" rx="1.5" />
          <path d="M4 5V3.5a2 2 0 014 0V5" />
        </svg>
        <span className="text-xs text-slate-500">pasala.com.ar/mi-club/dashboard</span>
      </div>
    </div>
    <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-slate-400">RESUMEN EJECUTIVO</p>
        <p className="text-xl font-bold text-slate-900">Panel del Club</p>
        <p className="text-sm text-slate-400">Club Andino · General Roca</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className="rounded-lg bg-[#1565C0] px-3 py-1.5 text-xs text-white">Gestionar reservas</button>
        <button type="button" className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-slate-600">Gestionar torneos</button>
      </div>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-b border-slate-200">
      {[
        { label: "Reservas confirmadas (7d)", value: "7",     cls: "text-slate-900" },
        { label: "Llenado próx. 7d",          value: "68%",   cls: "text-[#1565C0]" },
        { label: "Jugadores únicos (30d)",    value: "24",    cls: "text-slate-900" },
        { label: "Hora pico",                 value: "18:00", cls: "text-emerald-600" },
      ].map((kpi) => (
        <div key={kpi.label} className="border-r border-slate-200 px-5 py-4 last:border-r-0">
          <p className="text-xs text-slate-500">{kpi.label}</p>
          <p className={`text-4xl font-bold ${kpi.cls}`}>{kpi.value}</p>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-3 gap-0">
      <div className="col-span-2 border-r border-slate-200 px-5 py-4">
        <p className="mb-3 text-xs uppercase tracking-wider text-slate-500">ACTIVIDAD SEMANAL (ÚLTIMOS 30 DÍAS)</p>
        <div className="grid grid-cols-8 gap-1">
          {[
            { h: "08", bg: "bg-slate-100",  text: "text-slate-400", bold: false },
            { h: "09", bg: "bg-blue-100",   text: "text-blue-500",  bold: false },
            { h: "10", bg: "bg-blue-200",   text: "text-blue-600",  bold: false },
            { h: "11", bg: "bg-blue-400",   text: "text-white",     bold: false },
            { h: "12", bg: "bg-slate-100",  text: "text-slate-400", bold: false },
            { h: "13", bg: "bg-slate-100",  text: "text-slate-400", bold: false },
            { h: "14", bg: "bg-blue-100",   text: "text-blue-500",  bold: false },
            { h: "15", bg: "bg-slate-100",  text: "text-slate-400", bold: false },
            { h: "16", bg: "bg-blue-200",   text: "text-blue-600",  bold: false },
            { h: "17", bg: "bg-blue-300",   text: "text-blue-700",  bold: false },
            { h: "18", bg: "bg-[#1565C0]",  text: "text-white",     bold: true  },
            { h: "19", bg: "bg-blue-400",   text: "text-white",     bold: false },
            { h: "20", bg: "bg-blue-300",   text: "text-blue-700",  bold: false },
            { h: "21", bg: "bg-blue-200",   text: "text-blue-600",  bold: false },
            { h: "22", bg: "bg-blue-100",   text: "text-blue-500",  bold: false },
            { h: "23", bg: "bg-slate-100",  text: "text-slate-400", bold: false },
          ].map(({ h, bg, text, bold }) => (
            <div key={h} className={`rounded py-1.5 text-center text-xs ${bold ? "font-bold" : "font-medium"} ${bg} ${text}${parseInt(h) < 16 ? " hidden sm:block" : ""}`}>{h}</div>
          ))}
        </div>
        <p className="mb-2 mt-4 text-xs uppercase tracking-wider text-slate-500">ÚLTIMOS PARTIDOS</p>
        <div className="flex items-center justify-between border-b border-slate-100 py-1.5">
          <span className="text-sm text-slate-700">Sáb. 19 abr. 20:00 · Cancha 1</span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-600">COMPLETADO</span>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-slate-700">Lun. 21 abr. 14:00 · Cancha 2</span>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">PROGRAMADO</span>
        </div>
      </div>
      <div className="col-span-1 px-5 py-4">
        <p className="mb-3 text-xs uppercase tracking-wider text-slate-500">TOP JUGADORES</p>
        <p className="mb-2 text-xs text-slate-500">Ranking del club</p>
        {[
          { pos: 1, name: "F. Castro",  pts: 320, cls: "text-amber-500" },
          { pos: 2, name: "P. Ríos",    pts: 298, cls: "text-[#1565C0]" },
          { pos: 3, name: "M. Andrade", pts: 275, cls: "text-[#1565C0]" },
          { pos: 4, name: "Lucas T.",   pts: 241, cls: "text-slate-500" },
          { pos: 5, name: "R. Soria",   pts: 198, cls: "text-slate-500" },
        ].map(({ pos, name, pts, cls }) => (
          <div key={pos} className="flex items-center gap-2 border-b border-slate-100 py-1.5 last:border-0">
            <span className="w-4 text-xs text-slate-400">{pos}</span>
            <span className="flex-1 text-sm text-slate-900">{name}</span>
            <span className={`hidden sm:inline-block text-sm font-semibold ${cls}`}>{pts}</span>
          </div>
        ))}
      </div>
    </div>
  </>,

  // ── 1: Agenda semanal ──────────────────────────────────────────────────────
  <>
    <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
      <div>
        <p className="text-xs uppercase tracking-widest text-slate-400">RESERVAS</p>
        <p className="text-base font-bold text-slate-900">Agenda semanal</p>
        <p className="text-sm text-slate-400">Mi club → Reservas</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="rounded-lg bg-[#1565C0] px-3 py-1.5 text-xs text-white">Agenda</span>
        <span className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-slate-500">Turnos fijos</span>
        <span className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-slate-500">Lista</span>
      </div>
    </div>
    <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-2">
      <span className="text-xs text-slate-400">{"<"}</span>
      <span className="text-xs text-slate-700">Lun, 21 Abr — Dom, 27 Abr</span>
      <span className="text-xs text-slate-400">{">"}</span>
    </div>
    <div className="flex flex-wrap gap-2 px-6 py-2">
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">SOLICITUD</span>
      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">CONFIRMADA</span>
      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">LIGA</span>
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">TORNEO</span>
      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">FIJO</span>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">LIBRE</span>
    </div>
    {/* Mobile: lista de reservas */}
    <div className="sm:hidden px-3 py-3 space-y-2">
      {([
        { fecha: "Lun 21 · 14:00", cancha: "Cancha 1", jugador: "M. Castro",       badge: "FIJO",   bc: "bg-indigo-50 text-indigo-700" },
        { fecha: "Mié 23 · 20:00", cancha: "Cancha 2", jugador: "P. Ríos",         badge: "FIJO",   bc: "bg-indigo-50 text-indigo-700" },
        { fecha: "Jue 24 · 19:00", cancha: "Cancha 3", jugador: "Liga Otoño",      badge: "LIGA",   bc: "bg-purple-50 text-purple-700" },
        { fecha: "Sáb 26 · 10:00", cancha: "Cancha 1", jugador: "Torneo Apertura", badge: "TORNEO", bc: "bg-green-50 text-green-700"  },
      ] as { fecha: string; cancha: string; jugador: string; badge: string; bc: string }[]).map(({ fecha, cancha, jugador, badge, bc }) => (
        <div key={fecha} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2">
          <div>
            <p className="text-xs font-medium text-slate-800">{jugador}</p>
            <p className="text-[10px] text-slate-400">{fecha} · {cancha}</p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${bc}`}>{badge}</span>
        </div>
      ))}
    </div>
    {/* Desktop: tabla completa */}
    <div className="hidden sm:block overflow-x-auto px-6 py-3">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-200 bg-slate-100">
            {["CANCHA", "LUN 21", "MAR 22", "MIÉ 23", "JUE 24", "VIE 25", "SÁB 26", "DOM 27"].map((h) => (
              <th key={h} className="whitespace-nowrap px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-100 bg-white">
            <td className="whitespace-nowrap py-1 pr-2 pl-2 text-xs font-semibold text-slate-700">Cancha 1</td>
            <td className="px-1 py-1"><div className="whitespace-nowrap rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">⟳ 14:00 M. Castro</div></td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-slate-50" /></td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-slate-50" /></td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-slate-50" /></td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-slate-50" /></td>
            <td className="px-1 py-1"><div className="whitespace-nowrap rounded border border-green-200 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">⚡ 10:00 Torneo Apertura</div></td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-slate-50" /></td>
          </tr>
          <tr className="border-b border-slate-100 bg-slate-50">
            <td className="whitespace-nowrap py-1 pr-2 pl-2 text-xs font-semibold text-slate-700">Cancha 2</td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-white" /></td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-white" /></td>
            <td className="px-1 py-1"><div className="whitespace-nowrap rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">📌 20:00 P. Ríos</div></td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-white" /></td>
            <td className="px-1 py-1"><div className="whitespace-nowrap rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">📌 20:00 P. Ríos</div></td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-white" /></td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-white" /></td>
          </tr>
          <tr className="border-b border-slate-100 bg-white">
            <td className="whitespace-nowrap py-1 pr-2 pl-2 text-xs font-semibold text-slate-700">Cancha 3</td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-slate-50" /></td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-slate-50" /></td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-slate-50" /></td>
            <td className="px-1 py-1"><div className="whitespace-nowrap rounded border border-purple-200 bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700">⚽ 19:00 Liga Otoño</div></td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-slate-50" /></td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-slate-50" /></td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-slate-50" /></td>
          </tr>
          <tr className="bg-slate-50">
            <td className="whitespace-nowrap py-1 pr-2 pl-2 text-xs font-semibold text-slate-700">Cancha 4</td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-white" /></td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-white" /></td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-white" /></td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-white" /></td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-white" /></td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-white" /></td>
            <td className="px-1 py-1"><div className="h-9 rounded border border-slate-100 bg-white" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </>,

  // ── 2: Turnos fijos ────────────────────────────────────────────────────────
  <>
    <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
      <div>
        <p className="text-xs uppercase tracking-widest text-slate-400">TURNOS FIJOS</p>
        <p className="text-base font-bold text-slate-900">Asignación semanal recurrente</p>
        <p className="text-sm text-slate-400">Mi club → Reservas → Turnos fijos</p>
      </div>
    </div>
    <div className="px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">Turnos fijos activos</p>
          <p className="text-xs text-slate-400">Semana del 21/04</p>
        </div>
        <button type="button" className="rounded-lg bg-[#1565C0] px-3 py-1.5 text-xs text-white">+ Asignar turno</button>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-slate-100">
              {["JUGADOR", "CANCHA", "DÍA", "HORARIO", "ESTADO"].map((h) => (
                <th key={h} className={`py-2 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600${h === "DÍA" || h === "HORARIO" ? " hidden sm:table-cell" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { av: "PR", name: "P. Ríos",    cancha: "Cancha 2", dia: "Miércoles", hora: "20:00", st: "ACTIVO",    sc: "bg-emerald-50 text-emerald-600", even: false },
              { av: "MC", name: "M. Castro",  cancha: "Cancha 1", dia: "Lunes",     hora: "14:00", st: "ACTIVO",    sc: "bg-emerald-50 text-emerald-600", even: true  },
              { av: "FV", name: "F. Castro",  cancha: "Cancha 3", dia: "Jueves",    hora: "19:00", st: "ACTIVO",    sc: "bg-emerald-50 text-emerald-600", even: false },
              { av: "LT", name: "Lucas T.",   cancha: "Cancha 2", dia: "Viernes",   hora: "20:00", st: "ACTIVO",    sc: "bg-emerald-50 text-emerald-600", even: true  },
              { av: "RS", name: "R. Soria",   cancha: "Cancha 4", dia: "Sábado",    hora: "10:00", st: "ACTIVO",    sc: "bg-emerald-50 text-emerald-600", even: false },
              { av: "MA", name: "M. Andrade", cancha: "Cancha 1", dia: "Martes",    hora: "18:00", st: "PENDIENTE", sc: "bg-amber-50 text-amber-600",     even: true  },
            ].map(({ av, name, cancha, dia, hora, st, sc, even }) => (
              <tr key={name} className={`border-b border-slate-100 last:border-0 ${even ? "bg-slate-50" : "bg-white"}`}>
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{av}</div>
                    <span className="text-sm font-medium text-slate-900">{name}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-4 text-sm text-slate-700">{cancha}</td>
                <td className="hidden sm:table-cell py-2.5 pr-4 text-sm text-slate-700">{dia}</td>
                <td className="hidden sm:table-cell py-2.5 pr-4 text-sm text-slate-700">{hora}</td>
                <td className="py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${sc}`}>{st}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </>,

  // ── 3: Torneos y ligas ─────────────────────────────────────────────────────
  <>
    <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
      <div>
        <p className="text-xs uppercase tracking-widest text-slate-400">TORNEOS</p>
        <p className="text-base font-bold text-slate-900">Gestión de eventos</p>
        <p className="text-sm text-slate-400">Mi club → Torneos</p>
      </div>
    </div>
    <div className="px-6 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-900">Eventos activos</p>
        <button type="button" className="rounded-lg bg-[#1565C0] px-3 py-1.5 text-xs text-white">+ Crear evento</button>
      </div>
      <p className="mb-2 mt-4 text-xs uppercase tracking-wider text-slate-500">TORNEOS</p>
      <div className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">TA</div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-slate-900">Torneo Apertura</p>
          <p className="text-xs text-slate-500">Tu Club · Mar 2026</p>
          <p className="text-xs text-slate-500">22/03 → 05/04/2026</p>
        </div>
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">TORNEO</span>
        <span className="whitespace-nowrap text-xs font-medium text-[#1565C0]">4 lugares disponibles</span>
        <button type="button" className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600">Ver</button>
      </div>
      <div className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-xs font-bold text-white">TI</div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-slate-900">Torneo Invierno</p>
          <p className="text-xs text-slate-500">Club Sur · Jun 2026</p>
          <p className="text-xs text-slate-500">07/06 → 22/06/2026</p>
        </div>
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">TORNEO</span>
        <span className="whitespace-nowrap text-xs font-medium text-[#1565C0]">8 lugares disponibles</span>
        <button type="button" className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600">Ver</button>
      </div>
      <p className="mb-2 mt-3 text-[9px] uppercase tracking-wider text-slate-500">LIGAS</p>
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-xs font-bold text-white">LA</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Liga Otoño</p>
          <p className="text-xs text-slate-500">Club Andino · 2026</p>
          <p className="text-[10px] text-slate-500">15/03 → 30/06/2026</p>
        </div>
        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-semibold text-purple-700">LIGA</span>
        <span className="whitespace-nowrap text-[10px] font-medium text-[#1565C0]">2 equipos más</span>
        <button type="button" className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600">Ver</button>
      </div>
    </div>
  </>,

  // ── 4: Bracket del torneo ──────────────────────────────────────────────────
  <>
    <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-slate-400">TORNEOS</p>
        <p className="text-sm font-bold text-slate-900">Bracket automático</p>
        <p className="text-xs text-slate-400">Mi club → Torneos</p>
      </div>
    </div>
    <div className="px-6 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-900">Torneo Apertura 2026</p>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-600">EN CURSO</span>
          <span className="text-xs text-slate-400">8 participantes</span>
        </div>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {/* Ronda 1 */}
        <div className="flex shrink-0 flex-col">
          <p className="mb-2 inline-block rounded bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">RONDA 1</p>
          {([
            { a: "F. Castro", sA: [6, 6],    b: "D. Morales", sB: [3, 2]    },
            { a: "M. Castro", sA: [6, 6],    b: "A. Burgos",  sB: [2, 1]    },
            { a: "P. Ríos",   sA: [6, 6],    b: "R. Soria",   sB: [4, 2]    },
            { a: "Lucas T.",  sA: [6, 4, 6], b: "M. Andrade", sB: [1, 6, 2] },
          ] as { a: string; sA: number[]; b: string; sB: number[] }[]).map(({ a, sA, b, sB }) => (
            <div key={a} className="mb-2 w-28 sm:w-44 rounded-lg border border-slate-200 bg-white p-2">
              {/* Set header */}
              <div className="flex items-center gap-1.5 pb-0.5">
                <div className="h-5 w-5 shrink-0" />
                <span className="flex-1" />
                <div className="flex gap-1">
                  {sA.map((_, si) => (
                    <span key={si} className="w-5 text-center text-[9px] text-slate-400">S{si + 1}</span>
                  ))}
                </div>
              </div>
              {/* Winner row */}
              <div className="flex items-center gap-1.5 border-b border-slate-100 py-1">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[8px] font-bold text-white">{a[0]}</div>
                <span className="flex-1 truncate text-[10px] font-medium text-slate-800">{a}</span>
                <div className="flex gap-1">
                  {sA.map((s, si) => (
                    <span key={si} className="w-5 text-center text-xs font-bold text-[#1565C0] bg-blue-50 rounded">{s}</span>
                  ))}
                </div>
              </div>
              {/* Loser row */}
              <div className="flex items-center gap-1.5 py-1">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[8px] font-bold text-slate-600">{b[0]}</div>
                <span className="flex-1 truncate text-[10px] font-medium text-slate-800">{b}</span>
                <div className="flex gap-1">
                  {sB.map((s, si) => (
                    <span key={si} className="w-5 text-center text-xs text-slate-400 bg-slate-50 rounded">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Conector */}
        <div className="flex items-center px-2">
          <div className="w-4 border-t-2 border-slate-300" />
        </div>
        {/* Semifinal */}
        <div className="flex shrink-0 flex-col justify-around">
          <p className="mb-2 inline-block rounded bg-blue-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-blue-600">SEMIFINAL</p>
          {([
            { a: "F. Castro", sA: [7, 6] as (number | null)[],      b: "M. Castro", sB: [5, 4] as (number | null)[],      done: true  },
            { a: "P. Ríos",   sA: [null, null] as (number | null)[], b: "Lucas T.", sB: [null, null] as (number | null)[], done: false },
          ] as { a: string; sA: (number | null)[]; b: string; sB: (number | null)[]; done: boolean }[]).map(({ a, sA, b, sB, done }) => (
            <div key={a} className={`mb-2 w-28 sm:w-44 rounded-lg border p-2 ${done ? "border-blue-200 bg-blue-50" : "border-2 border-blue-400 bg-blue-100/50"}`}>
              {/* Set header */}
              <div className="flex items-center gap-1.5 pb-0.5">
                <div className="h-5 w-5 shrink-0" />
                <span className="flex-1" />
                <div className="flex gap-1">
                  {sA.map((_, si) => (
                    <span key={si} className="w-5 text-center text-[9px] text-slate-400">S{si + 1}</span>
                  ))}
                </div>
              </div>
              {/* Player A */}
              <div className="flex items-center gap-1.5 border-b border-blue-100 py-1">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[8px] font-bold text-white">{a[0]}</div>
                <span className={`flex-1 truncate text-[10px] ${done ? "font-semibold text-blue-900" : "font-medium text-slate-800"}`}>{a}</span>
                <div className="flex gap-1">
                  {sA.map((s, si) => (
                    <span key={si} className={`w-5 text-center text-xs rounded ${done ? "font-bold text-white bg-blue-600" : "text-slate-300 bg-blue-100"}`}>
                      {s !== null ? s : "-"}
                    </span>
                  ))}
                </div>
              </div>
              {/* Player B */}
              <div className="flex items-center gap-1.5 py-1">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[8px] font-bold text-slate-600">{b[0]}</div>
                <span className="flex-1 truncate text-[10px] font-medium text-slate-600">{b}</span>
                <div className="flex gap-1">
                  {sB.map((s, si) => (
                    <span key={si} className="w-5 text-center text-xs rounded text-blue-300 bg-blue-100">
                      {s !== null ? s : "-"}
                    </span>
                  ))}
                </div>
              </div>
              {!done && <div className="mt-1 text-right"><span className="rounded px-1 py-0.5 text-[8px] font-semibold bg-blue-600 text-white">EN CURSO</span></div>}
            </div>
          ))}
        </div>
        {/* Conector */}
        <div className="flex items-center px-2">
          <div className="w-4 border-t-2 border-slate-300" />
        </div>
        {/* Final */}
        <div className="flex shrink-0 flex-col justify-center">
          <p className="mb-2 inline-block rounded bg-amber-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-700">FINAL</p>
          <div className="w-28 sm:w-44 rounded-lg border border-amber-300 bg-amber-50 p-2 shadow-md shadow-amber-100">
            <div className="flex items-center gap-1.5 border-b border-amber-100 py-1">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[8px] font-bold text-white">F</div>
              <span className="flex-1 truncate text-[10px] font-bold text-amber-900">F. Castro</span>
            </div>
            <div className="flex items-center gap-1.5 py-1">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">?</div>
              <span className="flex-1 text-[10px] italic text-amber-600">Por definir</span>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 border-t border-slate-100 pt-3">
        <p className="text-[10px] text-slate-500">Generado automáticamente · 8 inscriptos · 3 rondas</p>
      </div>
    </div>
  </>,

  // ── 5: Ranking del club ────────────────────────────────────────────────────
  <>
    <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-slate-400">JUGADORES</p>
        <p className="text-sm font-bold text-slate-900">Directorio y ranking</p>
        <p className="text-xs text-slate-400">Mi club → Jugadores</p>
      </div>
    </div>
    <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-3">
      <span className="text-xs font-medium text-slate-700">94 jugadores</span>
      <span className="text-slate-300">·</span>
      <span className="text-xs text-slate-600">Cat. 5ta–7ma</span>
      <span className="text-slate-300">·</span>
      <span className="text-xs text-slate-600">Activos este mes: 24</span>
    </div>
    <div className="overflow-x-auto px-6 py-2">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-200 bg-slate-100">
            {["JUGADOR", "UBICACIÓN", "CAT", "ÍNDICE PASALA", "NIVEL", "WR", "PJ", "RACHA"].map((h) => (
              <th key={h} className={`whitespace-nowrap py-2 pr-3 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-600${h === "UBICACIÓN" || h === "PJ" ? " hidden sm:table-cell" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            { name: "F. Castro",  ubi: "Gral. Roca", cat: "6ta", idx: 65.0, iw: "65%", nv: "COMPETITIVO", nc: "bg-blue-100 text-blue-700",   wr: "83.3%", pj: 2, r: "W1", rc: "text-emerald-600", even: false },
            { name: "M. Castro",  ubi: "Gral. Roca", cat: "6ta", idx: 63.9, iw: "64%", nv: "COMPETITIVO", nc: "bg-blue-100 text-blue-700",   wr: "100%",  pj: 4, r: "W4", rc: "text-emerald-600", even: true  },
            { name: "P. Ríos",    ubi: "Lamarque",   cat: "5ta", idx: 61.2, iw: "61%", nv: "COMPETITIVO", nc: "bg-blue-100 text-blue-700",   wr: "83.3%", pj: 2, r: "W1", rc: "text-emerald-600", even: false },
            { name: "Lucas T.",   ubi: "Gral. Roca", cat: "6ta", idx: 57.0, iw: "57%", nv: "COMPETITIVO", nc: "bg-blue-100 text-blue-700",   wr: "66.7%", pj: 4, r: "W4", rc: "text-emerald-600", even: true  },
            { name: "R. Soria",   ubi: "Gral. Roca", cat: "6ta", idx: 52.3, iw: "52%", nv: "AMATEUR",     nc: "bg-amber-100 text-amber-700", wr: "66.7%", pj: 1, r: "L1", rc: "text-red-500",     even: false },
            { name: "M. Andrade", ubi: "Cipolletti", cat: "6ta", idx: 50.1, iw: "50%", nv: "AMATEUR",     nc: "bg-amber-100 text-amber-700", wr: "50%",   pj: 1, r: "W3", rc: "text-emerald-600", even: true  },
            { name: "A. Burgos",  ubi: "Gral. Roca", cat: "5ta", idx: 48.3, iw: "48%", nv: "INICIAL",     nc: "bg-slate-100 text-slate-600", wr: "100%",  pj: 0, r: "W2", rc: "text-emerald-600", even: false },
            { name: "D. Morales", ubi: "Gral. Roca", cat: "5ta", idx: 35.7, iw: "36%", nv: "INICIAL",     nc: "bg-slate-100 text-slate-600", wr: "16.7%", pj: 1, r: "L3", rc: "text-red-500",     even: true  },
          ].map(({ name, ubi, cat, idx, iw, nv, nc, wr, pj, r, rc, even }) => (
            <tr key={name} className={`border-b border-slate-100 last:border-0 ${even ? "bg-slate-50" : "bg-white"}`}>
              <td className="whitespace-nowrap py-2 pr-3 text-xs font-semibold text-slate-900">{name}</td>
              <td className="hidden sm:table-cell whitespace-nowrap py-2 pr-3 text-xs text-slate-600">{ubi}</td>
              <td className="py-2 pr-3 text-xs text-slate-600">{cat}</td>
              <td className="py-2 pr-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-800">{idx}</span>
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-[#1565C0]" style={{ width: iw }} />
                  </div>
                </div>
              </td>
              <td className="py-2 pr-3">
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${nc}`}>{nv}</span>
              </td>
              <td className="py-2 pr-3 text-xs font-medium text-slate-700">{wr}</td>
              <td className="hidden sm:table-cell py-2 pr-3 text-xs text-slate-600">{pj}</td>
              <td className={`py-2 text-xs font-bold ${rc}`}>{r}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>,

  // ── 6: Entrenadores ────────────────────────────────────────────────────────
  <>
    <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-slate-400">ENTRENADORES</p>
        <p className="text-sm font-bold text-slate-900">Gestión de entrenadores del club</p>
        <p className="text-xs text-slate-400">Mi club → Entrenadores</p>
      </div>
    </div>
    <div className="px-6 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-900">Entrenadores vinculados</p>
        <button type="button" className="rounded-lg bg-[#1565C0] px-3 py-1.5 text-[10px] text-white">+ Vincular entrenador</button>
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {([
          {
            av: "CR", name: "C. Romero",  esp: "Técnico federado",  alumnos: 12, clases: 8,
            pupils: [{ i: "FV", c: "bg-emerald-200 text-emerald-700" }, { i: "MC", c: "bg-amber-200 text-amber-700" }, { i: "PR", c: "bg-blue-200 text-blue-700" }, { i: "LT", c: "bg-purple-200 text-purple-700" }],
            extra: "+8",
          },
          {
            av: "LA", name: "L. Andrade", esp: "Preparador físico", alumnos: 6,  clases: 4,
            pupils: [{ i: "RS", c: "bg-emerald-200 text-emerald-700" }, { i: "MA", c: "bg-amber-200 text-amber-700" }, { i: "AB", c: "bg-blue-200 text-blue-700" }],
            extra: "+3",
          },
          {
            av: "MV", name: "M. Vega",    esp: "Iniciación",        alumnos: 8,  clases: 6,
            pupils: [{ i: "DM", c: "bg-purple-200 text-purple-700" }, { i: "FV", c: "bg-emerald-200 text-emerald-700" }, { i: "MC", c: "bg-amber-200 text-amber-700" }],
            extra: "+5",
          },
        ] as { av: string; name: string; esp: string; alumnos: number; clases: number; pupils: { i: string; c: string }[]; extra: string }[]).map(({ av, name, esp, alumnos, clases, pupils, extra }) => (
          <div key={av} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white shadow-md"
                style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
              >{av}</div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">{name}</p>
                <p className="text-[10px] text-slate-400">{esp}</p>
                <span className="mt-0.5 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-blue-600">ENTRENADOR</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
              <div>
                <p className="text-[9px] text-slate-400">Alumnos</p>
                <p className="text-lg font-bold text-slate-900">{alumnos}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400">Clases/sem</p>
                <p className="text-lg font-bold text-slate-900">{clases}</p>
              </div>
            </div>
            <div className="mt-3">
              <p className="mb-1.5 text-[9px] text-slate-400">Sus alumnos:</p>
              <div className="flex -space-x-2">
                {pupils.map(({ i, c }) => (
                  <div key={i} className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[8px] font-bold ${c}`}>{i}</div>
                ))}
                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[8px] font-bold text-slate-500">{extra}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <p className="mb-3 inline-block rounded bg-slate-100 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-600">PRÓXIMAS CLASES</p>
        {([
          { av: "CR", coach: "C. Romero",  clase: "Clase avanzada",    fecha: "Lun 21 · 18:00 · Cancha 1", ins: "4 inscriptos" },
          { av: "LA", coach: "L. Andrade", clase: "Preparación física", fecha: "Mar 22 · 07:00 · Cancha 3", ins: "3 inscriptos" },
          { av: "MV", coach: "M. Vega",    clase: "Iniciación pádel",   fecha: "Mié 23 · 10:00 · Cancha 2", ins: "6 inscriptos" },
        ] as { av: string; coach: string; clase: string; fecha: string; ins: string }[]).map(({ av, coach, clase, fecha, ins }) => (
          <div key={av} className="mb-2 flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
              style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
            >{av}</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900">{coach} · {clase}</p>
              <p className="text-[10px] text-slate-400">{fecha}</p>
            </div>
            <span className="ml-auto shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-600">{ins}</span>
          </div>
        ))}
      </div>
    </div>
  </>,
];

// ─────────────────────────────────────────────────────────────────────────────

export function LandingClubes() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const activeRef = useRef(0);
  const progressRef = useRef(0);

  useEffect(() => {
    const tick = setInterval(() => {
      progressRef.current += 100 / 50;
      if (progressRef.current >= 100) {
        progressRef.current = 0;
        activeRef.current = (activeRef.current + 1) % SLIDES.length;
        setActive(activeRef.current);
        setProgress(0);
      } else {
        setProgress(progressRef.current);
      }
    }, 100);
    return () => clearInterval(tick);
  }, []);

  const goTo = useCallback((i: number) => {
    activeRef.current = i;
    progressRef.current = 0;
    setActive(i);
    setProgress(0);
  }, []);

  return (
    <section
      id="clubes"
      className="relative overflow-hidden px-8 py-24"
      style={{ background: "#0a1628" }}
    >
      <style>{`
        @keyframes cardFade {
          from { opacity: 0; transform: scale(0.98); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Círculos decorativos de fondo */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div
          className="absolute h-96 w-96 rounded-full bg-blue-600/10 blur-3xl"
          style={{ top: 0, left: "25%", transform: "translateX(-50%)" }}
        />
        <div
          className="absolute h-80 w-80 rounded-full bg-blue-400/5 blur-3xl"
          style={{ bottom: 0, right: "25%" }}
        />
      </div>

      <div className="relative z-10">

        {/* ── ZONA 1 — Header centrado ─────────────────────────────── */}
        <div className="mb-12 text-center">
          <p className="mb-4 text-[11px] uppercase tracking-[0.25em] text-blue-400/60">
            PARA CLUBES
          </p>
          <h2
            className="text-5xl font-normal leading-tight lg:text-6xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            <span className="text-white">Tu comunidad ya utiliza Pasala.</span>
            <br />
            <span className="italic text-[#1565C0]">¿Tu club está listo?</span>
          </h2>
        </div>

        {/* Pantalla activa */}
        <div className="mx-auto min-h-[420px] max-w-4xl">
          <div
            key={`screen-${active}`}
            style={{ animation: "cardFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) both" }}
          >
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#f8fafc] shadow-2xl">
              {SLIDES[active]}
            </div>
          </div>
        </div>

        {/* Dots de progreso */}
        <div className="mx-auto mt-8 flex max-w-4xl items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Pantalla ${i + 1}`}
              className="flex-1"
            >
              {i === active ? (
                <div className="h-1 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-blue-400"
                    style={{ width: `${progress}%`, transition: "width 0.1s linear" }}
                  />
                </div>
              ) : (
                <div className="h-1 rounded-full bg-white/15" />
              )}
            </button>
          ))}
        </div>

        {/* Texto descriptivo del slide activo */}
        <div className="mt-6 min-h-[72px] text-center">
          <div
            key={active}
            style={{ animation: "cardFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both" }}
          >
            <p className="text-lg font-semibold text-white">{SLIDE_TEXT[active].title}</p>
            <p className="mx-auto mt-1 max-w-xl text-sm text-slate-400">{SLIDE_TEXT[active].desc}</p>
          </div>
        </div>

        {/* ── ZONA 3 — Pills de features ───────────────────────────── */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {[
            {
              label: "Agenda semanal por cancha",
              icon: (
                <svg viewBox="0 0 14 14" width={14} height={14} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5">
                  <rect x="1" y="1" width="5" height="5" rx="0.5" />
                  <rect x="8" y="1" width="5" height="5" rx="0.5" />
                  <rect x="1" y="8" width="5" height="5" rx="0.5" />
                  <rect x="8" y="8" width="5" height="5" rx="0.5" />
                </svg>
              ),
            },
            {
              label: "Turnos fijos automáticos",
              icon: (
                <svg viewBox="0 0 14 14" width={14} height={14} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5">
                  <circle cx="7" cy="7" r="6" />
                  <path d="M7 3.5V7l2 2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ),
            },
            {
              label: "Torneos y ligas integradas",
              icon: (
                <svg viewBox="0 0 14 14" width={14} height={14} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5">
                  <path d="M7 1.5l1.3 3.7H12L9 7.5l1.2 3.7L7 9l-3.2 2.2L5 7.5 2 5.2h3.7z" strokeLinejoin="round" />
                </svg>
              ),
            },
            {
              label: "Métricas en tiempo real",
              icon: (
                <svg viewBox="0 0 14 14" width={14} height={14} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5">
                  <circle cx="7" cy="7" r="6" />
                  <circle cx="7" cy="7" r="2.5" />
                </svg>
              ),
            },
          ].map(({ label, icon }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5"
            >
              {icon}
              <span className="text-sm text-white/70">{label}</span>
            </div>
          ))}
        </div>

        {/* ── ZONA 4 — CTA ─────────────────────────────────────────── */}
        <div className="mt-12 text-center">
          <a
            href="https://wa.me/5492984315287"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="inline-flex items-center gap-3 rounded-full bg-emerald-500 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition-colors duration-200 hover:bg-emerald-400">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.561 4.14 1.541 5.874L.057 23.882l6.19-1.622A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.878 9.878 0 01-5.031-1.378l-.361-.214-3.741.981.999-3.648-.235-.374A9.859 9.859 0 012.106 12C2.106 6.58 6.58 2.106 12 2.106c5.421 0 9.894 4.474 9.894 9.894 0 5.421-4.473 9.894-9.894 9.894z" />
              </svg>
              Hablemos por WhatsApp
            </span>
          </a>
          <p className="mt-3 text-xs text-slate-500">Sin contratos. Sin costos de setup.</p>
        </div>

      </div>
    </section>
  );
}
