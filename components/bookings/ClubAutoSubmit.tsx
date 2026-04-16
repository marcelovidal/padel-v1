"use client";
import { useRouter } from "next/navigation";

interface Club {
  id: string;
  name: string;
  city?: string | null;
  region_name?: string | null;
}

interface ClubAutoSubmitProps {
  clubs: Club[];
  selectedClubId: string;
  currentParams: {
    date: string;
    view: string;
    cursor: string;
  };
}

export function ClubAutoSubmit({ clubs, selectedClubId, currentParams }: ClubAutoSubmitProps) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const qs = new URLSearchParams();
    qs.set("date", currentParams.date);
    qs.set("view", currentParams.view);
    qs.set("cursor", currentParams.cursor);
    if (e.target.value) qs.set("club_id", e.target.value);
    router.push(`/player/bookings/new?${qs.toString()}`);
  };

  return (
    <select
      value={selectedClubId}
      onChange={handleChange}
      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
    >
      <option value="">Selecciona un club</option>
      {clubs.map((club) => (
        <option key={club.id} value={club.id}>
          {club.name}
          {club.city ? ` - ${club.city}` : ""}
          {club.region_name ? ` (${club.region_name})` : ""}
        </option>
      ))}
    </select>
  );
}
