"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, CalendarDays, Target, BookOpen, Settings } from "lucide-react";
import { CoachMyPlayers } from "./CoachMyPlayers";
import { CoachAgenda } from "./CoachAgenda";
import { CoachChallenges } from "./CoachChallenges";
import { CoachLegajo } from "./CoachLegajo";
import type { CoachProfile, CoachStudentRow, CoachNote, CoachChallenge, TrainingSession, CoachBookingEnriched } from "@/repositories/coach.repository";

interface Props {
  coachProfile: CoachProfile | null;
  students: CoachStudentRow[];
  activeTab: string;
  selectedPlayerId: string | null;
  challenges: CoachChallenge[];
  bookings: CoachBookingEnriched[];
  notes: CoachNote[];
  sessions: TrainingSession[];
  directoryPlayers: any[];
  coachPlayerStatuses: { player_id: string; status: string }[];
  myPlayerId: string;
  initialQuery: string;
}

const TABS = [
  { key: "alumnos",  label: "Alumnos",  icon: Users },
  { key: "agenda",   label: "Agenda",   icon: CalendarDays },
  { key: "desafios", label: "Desafíos", icon: Target },
];

export function CoachDashboard({
  coachProfile,
  students,
  activeTab,
  selectedPlayerId,
  challenges,
  bookings,
  notes,
  sessions,
  directoryPlayers,
  coachPlayerStatuses,
  myPlayerId,
  initialQuery,
}: Props) {
  const isLegajo = activeTab === "legajo" && selectedPlayerId;
  const selectedStudent = students.find((s) => s.id === selectedPlayerId) ?? null;

  return (
    <div className="container mx-auto max-w-5xl p-4 space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">
            Mi equipo
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {students.length} alumno{students.length !== 1 ? "s" : ""} activo{students.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/player/coach/setup"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Settings className="h-3.5 w-3.5" />
          Configurar
        </Link>
      </div>

      {/* Tabs */}
      {!isLegajo && (
        <div className="flex items-center gap-1 border-b border-gray-200">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <Link
                key={tab.key}
                href={`/player/coach?tab=${tab.key}`}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* Content */}
      {isLegajo && selectedStudent && coachProfile ? (
        <CoachLegajo
          coachId={coachProfile.id}
          student={selectedStudent}
          notes={notes}
          sessions={sessions}
          challenges={challenges}
        />
      ) : activeTab === "alumnos" ? (
        <CoachMyPlayers
          students={students}
          coachProfile={coachProfile}
        />
      ) : activeTab === "agenda" ? (
        <CoachAgenda bookings={bookings} coachProfile={coachProfile} students={students} />
      ) : activeTab === "desafios" ? (
        <CoachChallenges
          challenges={challenges}
          students={students}
          coachProfile={coachProfile}
        />
      ) : null}
    </div>
  );
}
