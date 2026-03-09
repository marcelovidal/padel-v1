"use client";

import { useState } from "react";

type TabKey = "calendar" | "by-day" | "week-bookings";

export function ClubAnalyticsTabs({
  calendarContent,
  byDayContent,
  weekBookingsContent,
}: {
  calendarContent: React.ReactNode;
  byDayContent: React.ReactNode;
  weekBookingsContent: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("calendar");

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "calendar", label: "Calendario semanal x horario" },
    { key: "by-day", label: "Partidos por dia (ultimos 30 dias)" },
    { key: "week-bookings", label: "Reservas semana vigente" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition-colors ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "border border-gray-200 bg-white text-gray-500 hover:border-blue-200 hover:text-blue-700"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === "calendar"
          ? calendarContent
          : activeTab === "by-day"
            ? byDayContent
            : weekBookingsContent}
      </div>
    </div>
  );
}
