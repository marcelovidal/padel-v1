"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GeoSelect } from "@/components/geo/GeoSelect";
import { useDebounce } from "@/hooks/useDebounce";
import { updatePlayerProfileAction } from "@/lib/actions/player-profile.actions";
import AvatarUploader from "@/components/player/AvatarUploader";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
  User, Phone, Mail, MapPin, Trophy, Calendar,
  CheckCircle, ChevronRight, Pencil,
} from "lucide-react";

interface Player {
  id: string;
  display_name: string;
  position: "drive" | "reves" | "cualquiera";
  city?: string | null;
  city_id?: string | null;
  region_code?: string | null;
  region_name?: string | null;
  country_code?: string | null;
  is_guest: boolean;
  avatar_url?: string | null;
  phone?: string | null;
  email?: string | null;
  category?: number | null;
  birth_year?: number | null;
}

const CATEGORIES = [
  { value: 1, label: "1ª", desc: "Profesional" },
  { value: 2, label: "2ª", desc: "Avanzado" },
  { value: 3, label: "3ª", desc: "Inter. Alto" },
  { value: 4, label: "4ª", desc: "Intermedio" },
  { value: 5, label: "5ª", desc: "Inter. Bajo" },
  { value: 6, label: "6ª", desc: "Amateur" },
  { value: 7, label: "7ª", desc: "Principiante" },
];

const POSITION_LABELS: Record<string, string> = {
  drive: "Drive",
  reves: "Revés",
  cualquiera: "Ambas",
};

function categoryLabel(cat: number | null | undefined) {
  const found = CATEGORIES.find((c) => c.value === cat);
  return found ? `${found.label} — ${found.desc}` : "Sin categoría";
}

// ── Success Card ─────────────────────────────────────────────

interface SavedProfile {
  display_name: string;
  position: string;
  city?: string;
  region_name?: string;
  phone?: string;
  email?: string;
  category?: number;
  birth_year?: number;
  avatarUrl?: string;
}

function ProfileSuccessCard({ profile, onEdit }: { profile: SavedProfile; onEdit: () => void }) {
  const initials = profile.display_name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const rows = [
    { icon: User,     label: "Posición",          value: POSITION_LABELS[profile.position] ?? profile.position },
    { icon: Trophy,   label: "Categoría",          value: categoryLabel(profile.category) },
    { icon: MapPin,   label: "Ubicación",          value: [profile.city, profile.region_name].filter(Boolean).join(", ") || "—" },
    { icon: Phone,    label: "Celular",            value: profile.phone || "—" },
    { icon: Mail,     label: "Email",              value: profile.email || "—" },
    { icon: Calendar, label: "Año de nacimiento",  value: profile.birth_year ? String(profile.birth_year) : "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
        <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600" />
        <p className="text-sm font-bold text-emerald-800">Perfil actualizado correctamente</p>
      </div>

      <div className="flex flex-col items-center gap-3 py-4">
        <UserAvatar src={profile.avatarUrl ?? null} initials={initials} size="xl" />
        <h2 className="text-2xl font-black tracking-tight text-gray-900">{profile.display_name}</h2>
      </div>

      <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-4 bg-white px-5 py-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50">
              <Icon className="h-4 w-4 text-gray-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
              <p className="truncate text-sm font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onEdit}
          className="flex items-center gap-2 rounded-2xl border border-gray-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </button>
        <a
          href="/player"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-gray-800 transition-colors"
        >
          Ir al inicio
          <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

// ── Main Form ────────────────────────────────────────────────

export function EditPlayerForm({ player, currentAvatarUrl }: { player: Player; currentAvatarUrl?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedProfile | null>(null);

  const [displayName, setDisplayName] = useState(player.display_name || "");
  const [position, setPosition] = useState<"drive" | "reves" | "cualquiera">(player.position || "cualquiera");
  const [avatarUrl, setAvatarUrl] = useState(player.avatar_url || "");
  const [phone, setPhone] = useState(player.phone || "");
  const [email, setEmail] = useState(player.email || "");
  const [category, setCategory] = useState<number | "">(
    player.category != null ? Number(player.category) : ""
  );
  const [birthYear, setBirthYear] = useState(player.birth_year ? String(player.birth_year) : "");

  const [provincias, setProvincias] = useState<any[]>([]);
  const [localidades, setLocalidades] = useState<any[]>([]);
  const [selectedProv, setSelectedProv] = useState<any>(null);
  const [selectedLoc, setSelectedLoc] = useState<any>(null);
  const [loadingProvs, setLoadingProvs] = useState(false);
  const [loadingLocs, setLoadingLocs] = useState(false);
  const [locQuery] = useState("");
  const debouncedLocQuery = useDebounce(locQuery, 300);

  useEffect(() => {
    setLoadingProvs(true);
    fetch("/api/geo/provincias")
      .then((r) => r.json())
      .then((data) => {
        setProvincias(data);
        if (player.region_code) {
          const found = data.find((p: any) => p.id === player.region_code);
          if (found) setSelectedProv(found);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingProvs(false));
  }, [player.region_code]);

  useEffect(() => {
    if (!selectedProv) { setLocalidades([]); setSelectedLoc(null); return; }
    setLoadingLocs(true);
    const url = `/api/geo/localidades?provincia=${selectedProv.id}${debouncedLocQuery ? `&q=${debouncedLocQuery}` : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setLocalidades(data);
        if (!selectedLoc && !debouncedLocQuery) {
          const match = player.city_id
            ? data.find((l: any) => l.id === player.city_id)
            : data.find((l: any) => l.nombre.toLowerCase() === (player.city ?? "").toLowerCase());
          if (match) setSelectedLoc(match);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingLocs(false));
  }, [selectedProv, debouncedLocQuery, player.city, player.city_id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.append("player_id", player.id);
    fd.append("display_name", displayName);
    fd.append("position", position);
    fd.append("avatar_url", avatarUrl);
    if (phone) fd.append("phone", phone);
    if (email) fd.append("email", email);
    if (category !== "") fd.append("category", String(category));
    if (birthYear) fd.append("birth_year", birthYear);
    const city = selectedLoc?.nombre ?? player.city ?? null;
    const city_id = selectedLoc?.id ?? player.city_id ?? null;
    const region_code = selectedProv?.id ?? player.region_code ?? null;
    const region_name = selectedProv?.nombre ?? player.region_name ?? null;
    if (city) { fd.append("city", city); if (city_id) fd.append("city_id", city_id); }
    if (region_code) { fd.append("region_code", region_code); if (region_name) fd.append("region_name", region_name); }

    const result = await updatePlayerProfileAction(fd);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSaved({
        display_name: displayName,
        position,
        city: selectedLoc?.nombre ?? player.city ?? undefined,
        region_name: selectedProv?.nombre ?? player.region_name ?? undefined,
        phone: phone || undefined,
        email: email || undefined,
        category: category !== "" ? (category as number) : undefined,
        birth_year: birthYear ? parseInt(birthYear, 10) : undefined,
        avatarUrl: avatarUrl || currentAvatarUrl,
      });
      router.refresh();
    }
  }

  if (saved) {
    return <ProfileSuccessCard profile={saved} onEdit={() => setSaved(null)} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      {/* Avatar */}
      <div className="flex justify-center mb-4">
        <AvatarUploader currentAvatarUrl={currentAvatarUrl} onUploadComplete={(path) => setAvatarUrl(path)} />
      </div>

      {/* Nombre */}
      <div className="space-y-2">
        <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Nombre Público</Label>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Tu nombre en el ranking"
          className="h-12 rounded-xl"
          required
        />
      </div>

      {/* Posición */}
      <div className="space-y-2">
        <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Posición</Label>
        <div className="grid grid-cols-3 gap-2">
          {(["drive", "reves", "cualquiera"] as const).map((p) => (
            <Button
              key={p}
              type="button"
              variant={position === p ? "default" : "outline"}
              onClick={() => setPosition(p)}
              className={`h-12 rounded-xl uppercase text-[10px] font-black tracking-widest ${position === p ? "bg-blue-600 hover:bg-blue-700" : ""}`}
            >
              {p === "cualquiera" ? "Ambas" : p}
            </Button>
          ))}
        </div>
      </div>

      {/* Categoría */}
      <div className="space-y-2">
        <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Categoría</Label>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(category === c.value ? "" : c.value)}
              className={`rounded-xl border px-2 py-3 text-center transition-colors ${
                category === c.value
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <p className="text-sm font-black">{c.label}</p>
              <p className="text-[9px] text-gray-400 leading-tight mt-0.5">{c.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Ubicación */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <GeoSelect
          label="Provincia"
          placeholder="Busca tu provincia..."
          options={provincias}
          value={selectedProv?.id}
          isLoading={loadingProvs}
          onChange={(prov) => { setSelectedProv(prov); setSelectedLoc(null); }}
        />
        <GeoSelect
          label="Localidad"
          placeholder={selectedProv ? "Busca tu ciudad..." : "Primero elige provincia"}
          options={localidades}
          value={selectedLoc?.id}
          isLoading={loadingLocs}
          disabled={!selectedProv}
          onChange={(loc) => setSelectedLoc(loc)}
        />
      </div>

      {/* Contacto */}
      <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Datos de contacto</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-500">Celular</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+54 9 299 000 0000"
                className="h-12 rounded-xl pl-9"
                type="tel"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-500">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="h-12 rounded-xl pl-9"
                type="email"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Año de nacimiento */}
      <div className="space-y-1.5">
        <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Año de nacimiento</Label>
        <div className="relative max-w-[180px]">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            placeholder="ej. 1990"
            className="h-12 rounded-xl pl-9"
            type="number"
            min={1940}
            max={2015}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 h-14 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-gray-900/10 transition-all active:scale-[0.98]"
        >
          {loading ? "Guardando..." : "Guardar Cambios"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="h-14 px-8 border-gray-200 rounded-2xl font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
