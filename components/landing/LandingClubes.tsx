"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Slides del carrusel
// ─────────────────────────────────────────────────────────────────────────────

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
        <p className="text-[10px] uppercase tracking-widest text-slate-400">RESUMEN EJECUTIVO</p>
        <p className="text-lg font-bold text-slate-900">Panel del Club</p>
        <p className="text-xs text-slate-400">Club Andino · General Roca</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className="rounded-lg bg-[#1565C0] px-3 py-1.5 text-xs text-white">Gestionar reservas</button>
        <button type="button" className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-slate-600">Gestionar torneos</button>
      </div>
    </div>
    <div className="grid grid-cols-4 gap-0 border-b border-stone-100">
      {[
        { label: "Reservas confirmadas (7d)", value: "7",     cls: "text-slate-900" },
        { label: "Llenado próx. 7d",          value: "68%",   cls: "text-[#1565C0]" },
        { label: "Jugadores únicos (30d)",    value: "24",    cls: "text-slate-900" },
        { label: "Hora pico",                 value: "18:00", cls: "text-emerald-600" },
      ].map((kpi) => (
        <div key={kpi.label} className="border-r border-stone-100 px-5 py-4 last:border-r-0">
          <p className="text-[10px] text-slate-400">{kpi.label}</p>
          <p className={`text-2xl font-bold ${kpi.cls}`}>{kpi.value}</p>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-3 gap-0">
      <div className="col-span-2 border-r border-stone-100 px-5 py-4">
        <p className="mb-3 text-[9px] uppercase tracking-wider text-slate-400">ACTIVIDAD SEMANAL (ÚLTIMOS 30 DÍAS)</p>
        <div className="grid grid-cols-8 gap-1">
          {[
            { h: "08", bg: "bg-stone-100",  text: "text-stone-300", bold: false },
            { h: "09", bg: "bg-blue-100",   text: "text-blue-400",  bold: false },
            { h: "10", bg: "bg-blue-200",   text: "text-blue-500",  bold: false },
            { h: "11", bg: "bg-blue-400",   text: "text-white",     bold: false },
            { h: "12", bg: "bg-stone-50",   text: "text-stone-200", bold: false },
            { h: "13", bg: "bg-stone-50",   text: "text-stone-200", bold: false },
            { h: "14", bg: "bg-blue-100",   text: "text-blue-400",  bold: false },
            { h: "15", bg: "bg-stone-50",   text: "text-stone-200", bold: false },
            { h: "16", bg: "bg-blue-200",   text: "text-blue-500",  bold: false },
            { h: "17", bg: "bg-blue-300",   text: "text-blue-700",  bold: false },
            { h: "18", bg: "bg-[#1565C0]",  text: "text-white",     bold: true  },
            { h: "19", bg: "bg-blue-400",   text: "text-white",     bold: false },
            { h: "20", bg: "bg-blue-300",   text: "text-blue-700",  bold: false },
            { h: "21", bg: "bg-blue-200",   text: "text-blue-500",  bold: false },
            { h: "22", bg: "bg-blue-100",   text: "text-blue-400",  bold: false },
            { h: "23", bg: "bg-stone-50",   text: "text-stone-200", bold: false },
          ].map(({ h, bg, text, bold }) => (
            <div key={h} className={`rounded py-1.5 text-center text-[9px] ${bold ? "font-bold" : "font-medium"} ${bg} ${text}`}>{h}</div>
          ))}
        </div>
        <p className="mb-2 mt-4 text-[9px] uppercase tracking-wider text-slate-400">ÚLTIMOS PARTIDOS</p>
        <div className="flex items-center justify-between border-b border-stone-50 py-1.5">
          <span className="text-xs text-slate-600">Sáb. 19 abr. 20:00 · Cancha 1</span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] text-emerald-600">COMPLETADO</span>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <span className="text-xs text-slate-600">Lun. 21 abr. 14:00 · Cancha 2</span>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] text-blue-600">PROGRAMADO</span>
        </div>
      </div>
      <div className="col-span-1 px-5 py-4">
        <p className="mb-3 text-[9px] uppercase tracking-wider text-slate-400">TOP JUGADORES</p>
        <p className="mb-2 text-[9px] text-slate-400">Ranking del club</p>
        {[
          { pos: 1, name: "F. Castro",  pts: 320, cls: "text-amber-500" },
          { pos: 2, name: "P. Ríos",    pts: 298, cls: "text-[#1565C0]" },
          { pos: 3, name: "M. Andrade", pts: 275, cls: "text-[#1565C0]" },
          { pos: 4, name: "Lucas T.",   pts: 241, cls: "text-slate-400" },
          { pos: 5, name: "R. Soria",   pts: 198, cls: "text-slate-400" },
        ].map(({ pos, name, pts, cls }) => (
          <div key={pos} className="flex items-center gap-2 border-b border-stone-50 py-1.5 last:border-0">
            <span className="w-4 text-[10px] text-slate-300">{pos}</span>
            <span className="flex-1 text-xs text-slate-700">{name}</span>
            <span className={`text-xs font-semibold ${cls}`}>{pts}</span>
          </div>
        ))}
      </div>
    </div>
  </>,

  // ── 1: Agenda semanal ──────────────────────────────────────────────────────
  <>
    <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-slate-400">RESERVAS</p>
        <p className="text-sm font-bold text-slate-900">Agenda semanal</p>
        <p className="text-xs text-slate-400">Mi club → Reservas</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="rounded-lg bg-[#1565C0] px-3 py-1.5 text-xs text-white">Agenda</span>
        <span className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-slate-500">Turnos fijos</span>
        <span className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-slate-500">Lista</span>
      </div>
    </div>
    <div className="flex items-center gap-2 border-b border-stone-100 px-6 py-2">
      <span className="text-xs text-slate-400">{"<"}</span>
      <span className="text-xs text-slate-600">Lun, 21 Abr — Dom, 27 Abr</span>
      <span className="text-xs text-slate-400">{">"}</span>
    </div>
    <div className="flex flex-wrap gap-2 px-6 py-2">
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-700">SOLICITUD</span>
      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold text-blue-700">CONFIRMADA</span>
      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-semibold text-purple-700">LIGA</span>
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-semibold text-green-700">TORNEO</span>
      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-semibold text-indigo-700">FIJO</span>
      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-semibold text-stone-500">LIBRE</span>
    </div>
    <div className="overflow-x-auto px-6 py-3">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {["CANCHA", "LUN 21", "MAR 22", "MIÉ 23", "JUE 24", "VIE 25", "SÁB 26", "DOM 27"].map((h) => (
              <th key={h} className="whitespace-nowrap pb-2 pr-2 text-left text-[9px] font-normal uppercase text-slate-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="whitespace-nowrap py-1 pr-2 text-[10px] font-medium text-slate-600">Cancha 1</td>
            <td className="px-1 py-1"><div className="whitespace-nowrap rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[9px] text-blue-700">⟳ 14:00 M. Castro</div></td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
            <td className="px-1 py-1"><div className="whitespace-nowrap rounded border border-green-200 bg-green-50 px-2 py-1 text-[9px] text-green-700">⚡ 10:00 Torneo Apertura</div></td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
          </tr>
          <tr>
            <td className="whitespace-nowrap py-1 pr-2 text-[10px] font-medium text-slate-600">Cancha 2</td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
            <td className="px-1 py-1"><div className="whitespace-nowrap rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[9px] text-indigo-700">📌 20:00 P. Ríos</div></td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
            <td className="px-1 py-1"><div className="whitespace-nowrap rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[9px] text-indigo-700">📌 20:00 P. Ríos</div></td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
          </tr>
          <tr>
            <td className="whitespace-nowrap py-1 pr-2 text-[10px] font-medium text-slate-600">Cancha 3</td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
            <td className="px-1 py-1"><div className="whitespace-nowrap rounded border border-purple-200 bg-purple-50 px-2 py-1 text-[9px] text-purple-700">⚽ 19:00 Liga Otoño</div></td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
          </tr>
          <tr>
            <td className="whitespace-nowrap py-1 pr-2 text-[10px] font-medium text-slate-600">Cancha 4</td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
            <td className="px-1 py-1"><div className="h-8 rounded bg-stone-50" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </>,

  // ── 1: Torneos ─────────────────────────────────────────────────────────────
  <>
    <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-slate-400">TORNEOS</p>
        <p className="text-sm font-bold text-slate-900">Gestión de eventos</p>
        <p className="text-xs text-slate-400">Mi club → Torneos</p>
      </div>
    </div>
    <div className="px-6 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-900">Eventos activos</p>
        <button type="button" className="rounded-lg bg-[#1565C0] px-3 py-1.5 text-[10px] text-white">+ Crear evento</button>
      </div>
      <p className="mb-2 mt-4 text-[9px] uppercase tracking-wider text-slate-400">TORNEOS</p>
      <div className="flex items-center gap-3 border-b border-stone-100 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">TA</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">Torneo Apertura</p>
          <p className="text-xs text-slate-400">Tu Club · Mar 2026</p>
          <p className="text-[10px] text-slate-400">22/03 → 05/04/2026</p>
        </div>
        <span className="rounded-full bg-green-100 px-2 text-[9px] text-green-700">TORNEO</span>
        <span className="whitespace-nowrap text-[10px] text-[#1565C0]">4 lugares disponibles</span>
        <button type="button" className="rounded border border-stone-200 px-2 py-1 text-xs text-slate-600">Ver</button>
      </div>
      <div className="flex items-center gap-3 border-b border-stone-100 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-xs font-bold text-amber-700">TI</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">Torneo Invierno</p>
          <p className="text-xs text-slate-400">Club Sur · Jun 2026</p>
          <p className="text-[10px] text-slate-400">07/06 → 22/06/2026</p>
        </div>
        <span className="rounded-full bg-green-100 px-2 text-[9px] text-green-700">TORNEO</span>
        <span className="whitespace-nowrap text-[10px] text-[#1565C0]">8 lugares disponibles</span>
        <button type="button" className="rounded border border-stone-200 px-2 py-1 text-xs text-slate-600">Ver</button>
      </div>
      <p className="mb-2 mt-4 text-[9px] uppercase tracking-wider text-slate-400">LIGAS</p>
      <div className="flex items-center gap-3 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-xs font-bold text-purple-700">LA</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">Liga Otoño</p>
          <p className="text-xs text-slate-400">Club Andino · 2026</p>
          <p className="text-[10px] text-slate-400">15/03 → 30/06/2026</p>
        </div>
        <span className="rounded-full bg-purple-100 px-2 text-[9px] text-purple-700">LIGA</span>
        <span className="whitespace-nowrap text-[10px] text-[#1565C0]">2 equipos más</span>
        <button type="button" className="rounded border border-stone-200 px-2 py-1 text-xs text-slate-600">Ver</button>
      </div>
    </div>
  </>,

  // ── 2: Turnos fijos ────────────────────────────────────────────────────────
  <>
    <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-slate-400">TURNOS FIJOS</p>
        <p className="text-sm font-bold text-slate-900">Asignación semanal recurrente</p>
        <p className="text-xs text-slate-400">Mi club → Reservas → Turnos fijos</p>
      </div>
    </div>
    <div className="px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">Turnos fijos activos</p>
          <p className="text-xs text-slate-400">Semana del 21/04</p>
        </div>
        <button type="button" className="rounded-lg bg-[#1565C0] px-3 py-1.5 text-[10px] text-white">+ Asignar turno</button>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-stone-200">
              {["JUGADOR", "CANCHA", "DÍA", "HORARIO", "ESTADO"].map((h) => (
                <th key={h} className="pb-2 pr-4 text-left text-[9px] font-normal uppercase text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { av: "PR", name: "P. Ríos",    cancha: "Cancha 2", dia: "Miércoles", hora: "20:00", st: "ACTIVO",    sc: "bg-emerald-50 text-emerald-600" },
              { av: "MC", name: "M. Castro",  cancha: "Cancha 1", dia: "Lunes",     hora: "14:00", st: "ACTIVO",    sc: "bg-emerald-50 text-emerald-600" },
              { av: "FV", name: "F. Castro",  cancha: "Cancha 3", dia: "Jueves",    hora: "19:00", st: "ACTIVO",    sc: "bg-emerald-50 text-emerald-600" },
              { av: "LT", name: "Lucas T.",   cancha: "Cancha 2", dia: "Viernes",   hora: "20:00", st: "ACTIVO",    sc: "bg-emerald-50 text-emerald-600" },
              { av: "RS", name: "R. Soria",   cancha: "Cancha 4", dia: "Sábado",    hora: "10:00", st: "ACTIVO",    sc: "bg-emerald-50 text-emerald-600" },
              { av: "MA", name: "M. Andrade", cancha: "Cancha 1", dia: "Martes",    hora: "18:00", st: "PENDIENTE", sc: "bg-amber-50 text-amber-600"    },
            ].map(({ av, name, cancha, dia, hora, st, sc }) => (
              <tr key={name} className="border-b border-stone-50 last:border-0">
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-700">{av}</div>
                    <span className="text-xs text-slate-700">{name}</span>
                  </div>
                </td>
                <td className="py-2 pr-4 text-xs text-slate-600">{cancha}</td>
                <td className="py-2 pr-4 text-xs text-slate-600">{dia}</td>
                <td className="py-2 pr-4 text-xs text-slate-600">{hora}</td>
                <td className="py-2"><span className={`rounded-full px-2 text-[9px] ${sc}`}>{st}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </>,

  // ── 3: Ranking del club ────────────────────────────────────────────────────
  <>
    <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-slate-400">JUGADORES</p>
        <p className="text-sm font-bold text-slate-900">Directorio y ranking</p>
        <p className="text-xs text-slate-400">Mi club → Jugadores</p>
      </div>
    </div>
    <div className="flex items-center gap-2 border-b border-stone-100 px-6 py-3">
      <span className="text-xs text-slate-500">94 jugadores</span>
      <span className="text-slate-300">·</span>
      <span className="text-xs text-slate-500">Cat. 5ta–7ma</span>
      <span className="text-slate-300">·</span>
      <span className="text-xs text-slate-500">Activos este mes: 24</span>
    </div>
    <div className="overflow-x-auto px-6 py-2">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-stone-200">
            {["JUGADOR", "UBICACIÓN", "CAT", "ÍNDICE PASALA", "NIVEL", "WR", "PJ", "RACHA"].map((h) => (
              <th key={h} className="whitespace-nowrap pb-2 pr-3 text-left text-[9px] font-normal uppercase tracking-wider text-slate-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            { name: "F. Castro",  ubi: "Gral. Roca", cat: "6ta", idx: 65.0, iw: "65%", nv: "COMPETITIVO", nc: "bg-blue-50 text-blue-600",    wr: "83.3%", pj: 2, r: "W1", rc: "text-emerald-600" },
            { name: "M. Castro",  ubi: "Gral. Roca", cat: "6ta", idx: 63.9, iw: "64%", nv: "COMPETITIVO", nc: "bg-blue-50 text-blue-600",    wr: "100%",  pj: 4, r: "W4", rc: "text-emerald-600" },
            { name: "P. Ríos",    ubi: "Lamarque",   cat: "5ta", idx: 61.2, iw: "61%", nv: "COMPETITIVO", nc: "bg-blue-50 text-blue-600",    wr: "83.3%", pj: 2, r: "W1", rc: "text-emerald-600" },
            { name: "Lucas T.",   ubi: "Gral. Roca", cat: "6ta", idx: 57.0, iw: "57%", nv: "COMPETITIVO", nc: "bg-blue-50 text-blue-600",    wr: "66.7%", pj: 4, r: "W4", rc: "text-emerald-600" },
            { name: "R. Soria",   ubi: "Gral. Roca", cat: "6ta", idx: 52.3, iw: "52%", nv: "AMATEUR",     nc: "bg-amber-50 text-amber-600",  wr: "66.7%", pj: 1, r: "L1", rc: "text-red-500"     },
            { name: "M. Andrade", ubi: "Cipolletti", cat: "6ta", idx: 50.1, iw: "50%", nv: "AMATEUR",     nc: "bg-amber-50 text-amber-600",  wr: "50%",   pj: 1, r: "W3", rc: "text-emerald-600" },
            { name: "A. Burgos",  ubi: "Gral. Roca", cat: "5ta", idx: 48.3, iw: "48%", nv: "INICIAL",     nc: "bg-stone-100 text-stone-500", wr: "100%",  pj: 0, r: "W2", rc: "text-emerald-600" },
            { name: "D. Morales", ubi: "Gral. Roca", cat: "5ta", idx: 35.7, iw: "36%", nv: "INICIAL",     nc: "bg-stone-100 text-stone-500", wr: "16.7%", pj: 1, r: "L3", rc: "text-red-500"     },
          ].map(({ name, ubi, cat, idx, iw, nv, nc, wr, pj, r, rc }) => (
            <tr key={name} className="border-b border-stone-50 last:border-0">
              <td className="whitespace-nowrap py-1.5 pr-3 text-xs font-medium text-slate-700">{name}</td>
              <td className="whitespace-nowrap py-1.5 pr-3 text-xs text-slate-500">{ubi}</td>
              <td className="py-1.5 pr-3 text-xs text-slate-500">{cat}</td>
              <td className="py-1.5 pr-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-700">{idx}</span>
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full rounded-full bg-[#1565C0]" style={{ width: iw }} />
                  </div>
                </div>
              </td>
              <td className="py-1.5 pr-3">
                <span className={`rounded-full px-2 py-0.5 text-[9px] ${nc}`}>{nv}</span>
              </td>
              <td className="py-1.5 pr-3 text-xs text-slate-600">{wr}</td>
              <td className="py-1.5 pr-3 text-xs text-slate-600">{pj}</td>
              <td className={`py-1.5 text-xs font-semibold ${rc}`}>{r}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>,

  // ── 4: Detalle de reserva ──────────────────────────────────────────────────
  <>
    <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-slate-400">RESERVAS</p>
        <p className="text-sm font-bold text-slate-900">Detalle de reserva confirmada</p>
        <p className="text-xs text-slate-400">Mi club → Reservas</p>
      </div>
    </div>
    <div className="px-6 py-4">
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">Reserva confirmada</p>
            <p className="mt-0.5 text-xs text-slate-500">Cancha 1 · Club Andino</p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-600">CONFIRMADA</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[9px] uppercase text-slate-400">FECHA Y HORA</p>
            <p className="text-sm font-semibold text-slate-800">Lunes 21 de abril</p>
            <p className="text-xs text-slate-500">14:00 – 15:30 hs</p>
          </div>
          <div>
            <p className="text-[9px] uppercase text-slate-400">CANCHA</p>
            <p className="text-sm font-semibold text-slate-800">Cancha 1</p>
            <p className="text-xs text-slate-500">Césped sintético · Interior</p>
          </div>
          <div>
            <p className="text-[9px] uppercase text-slate-400">JUGADOR</p>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-700">MC</div>
              <div>
                <p className="text-sm font-semibold text-slate-800">M. Castro</p>
                <p className="text-xs text-slate-400">Cat. 6ta · Competitivo</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-[9px] uppercase text-slate-400">TIPO</p>
            <p className="text-sm font-semibold text-slate-800">Reserva esporádica</p>
            <p className="text-xs text-emerald-600">Pagado online</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="rounded-lg border border-red-200 px-4 py-2 text-xs text-red-500">Cancelar reserva</button>
          <button type="button" className="rounded-lg border border-stone-200 px-4 py-2 text-xs text-slate-600">Ver jugador</button>
          <button type="button" className="rounded-lg bg-[#1565C0] px-4 py-2 text-xs text-white">Marcar como jugado</button>
        </div>
      </div>
      <div className="mt-4 border-t border-stone-100 pt-4">
        <p className="mb-2 text-[9px] uppercase tracking-wider text-slate-400">HISTORIAL EN ESTE CLUB</p>
        <div className="flex items-center justify-between py-1.5">
          <span className="text-xs text-slate-600">Sáb. 19 abr. · Cancha 2 · 20:00</span>
          <span className="text-[9px] text-emerald-600">COMPLETADO</span>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <span className="text-xs text-slate-600">Lun. 14 abr. · Cancha 1 · 14:00</span>
          <span className="text-[9px] text-emerald-600">COMPLETADO</span>
        </div>
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
      className="relative overflow-hidden px-8 py-24"
      style={{ background: "#0a1628" }}
    >
      <style>{`
        @keyframes cardEnter {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
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
            className="text-5xl font-normal leading-tight text-white lg:text-6xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Tu club, organizado.
            <br />
            Tus jugadores, volviendo.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-400">
            Reservas, turnos fijos, torneos, ligas y métricas.
            Todo desde un panel diseñado para los clubes de la Patagonia.
          </p>
        </div>

        {/* Barra de progreso */}
        <div className="mx-auto mb-8 flex max-w-4xl items-center gap-2">
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

        {/* Pantalla activa */}
        <div className="mx-auto min-h-[420px] max-w-4xl">
          <div
            key={active}
            style={{ animation: "cardEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both" }}
          >
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#f8fafc] shadow-2xl">
              {SLIDES[active]}
            </div>
          </div>
        </div>

        {/* ── ASÍ SE VE EN LA APP ──────────────────────────────────── */}
        <div className="mb-8 mt-12 text-center">
          <p className="text-[11px] uppercase tracking-[0.25em] text-blue-400/60">
            ASÍ SE VE EN LA APP
          </p>
          <p className="mt-2 text-2xl font-normal text-white/80">
            Cada función, diseñada para el dueño del club.
          </p>
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
