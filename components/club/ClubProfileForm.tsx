"use client";

import { useState, useTransition } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { updateClubProfileAction } from "@/lib/actions/club-profile.actions";

type ClubProfileFormProps = {
  club: {
    id: string;
    name: string;
    address: string | null;
    description: string | null;
    access_type: "abierta" | "cerrada" | null;
    courts_count: number | null;
    has_glass: boolean;
    has_synthetic_grass: boolean;
    contact_first_name: string | null;
    contact_last_name: string | null;
    contact_phone: string | null;
    avatar_url: string | null;
  };
  userId: string;
  currentAvatarSrc?: string | null;
};

async function uploadClubAvatar(supabase: ReturnType<typeof createBrowserSupabase>, userId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file);
  if (error) throw error;
  return path;
}

export function ClubProfileForm({ club, userId, currentAvatarSrc = null }: ClubProfileFormProps) {
  const supabase = createBrowserSupabase();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(club.name || "");
  const [address, setAddress] = useState(club.address || "");
  const [description, setDescription] = useState(club.description || "");
  const [accessType, setAccessType] = useState<"abierta" | "cerrada">(club.access_type || "abierta");
  const [courtsCount, setCourtsCount] = useState(String(club.courts_count ?? ""));
  const [hasGlass, setHasGlass] = useState(!!club.has_glass);
  const [hasSynthetic, setHasSynthetic] = useState(!!club.has_synthetic_grass);
  const [contactFirst, setContactFirst] = useState(club.contact_first_name || "");
  const [contactLast, setContactLast] = useState(club.contact_last_name || "");
  const [contactPhone, setContactPhone] = useState(club.contact_phone || "");
  const [avatarPath, setAvatarPath] = useState(club.avatar_url || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onAvatarChange(file: File | null) {
    if (!file) return;
    setError(null);
    try {
      const path = await uploadClubAvatar(supabase, userId, file);
      setAvatarPath(path);
      setAvatarPreview(URL.createObjectURL(file));
    } catch (uploadError: any) {
      setError(`No pudimos subir el logo: ${uploadError?.message || "error inesperado"}`);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("club_id", club.id);
      formData.set("name", name);
      formData.set("address", address);
      formData.set("description", description);
      formData.set("access_type", accessType);
      formData.set("courts_count", courtsCount);
      formData.set("contact_first_name", contactFirst);
      formData.set("contact_last_name", contactLast);
      formData.set("contact_phone", contactPhone);
      formData.set("avatar_url", avatarPath);
      if (hasGlass) formData.set("has_glass", "on");
      if (hasSynthetic) formData.set("has_synthetic_grass", "on");

      const result = await updateClubProfileAction(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccess("Perfil actualizado correctamente.");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-black uppercase tracking-widest text-gray-500">Logo / Avatar</label>
        <input
          type="file"
          accept="image/*"
          className="w-full rounded-xl border border-gray-300 px-4 py-3"
          onChange={(e) => onAvatarChange(e.target.files?.[0] || null)}
        />
        {(avatarPreview || currentAvatarSrc) && (
          <img
            src={avatarPreview || currentAvatarSrc || undefined}
            alt="Logo del club"
            className="h-16 w-16 rounded-xl border border-gray-200 object-cover"
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-widest text-gray-500">Nombre del club</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3" required />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-widest text-gray-500">Direccion</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-black uppercase tracking-widest text-gray-500">Descripcion</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-xl border border-gray-300 px-4 py-3" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-widest text-gray-500">Tipo de acceso</label>
          <select value={accessType} onChange={(e) => setAccessType(e.target.value as "abierta" | "cerrada")} className="w-full rounded-xl border border-gray-300 px-4 py-3">
            <option value="abierta">Abierta</option>
            <option value="cerrada">Cerrada</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-widest text-gray-500">Cantidad de canchas</label>
          <input type="number" min={0} value={courtsCount} onChange={(e) => setCourtsCount(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-widest text-gray-500">Contacto nombre</label>
          <input value={contactFirst} onChange={(e) => setContactFirst(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-widest text-gray-500">Contacto apellido</label>
          <input value={contactLast} onChange={(e) => setContactLast(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-widest text-gray-500">Celular</label>
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3" />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={hasGlass} onChange={(e) => setHasGlass(e.target.checked)} />
          Canchas con blindex
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={hasSynthetic} onChange={(e) => setHasSynthetic(e.target.checked)} />
          Cesped sintetico
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">{success}</p>}

      <button type="submit" disabled={isPending} className="rounded-xl bg-blue-600 px-4 py-3 text-white font-black disabled:opacity-60">
        {isPending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
