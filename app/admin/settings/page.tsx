import { getAllAppSettings } from "@/repositories/app-settings.repository";
import { FeatureFlagsPanel } from "./FeatureFlagsPanel";

export default async function AdminSettingsPage() {
  const settings = await getAllAppSettings();
  const bookingsEnabled = settings["bookings_enabled"] === "true";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Configuración</h1>
        <p className="mt-1 text-sm text-gray-500">
          Feature flags y parámetros globales de la aplicación.
        </p>
      </div>

      <FeatureFlagsPanel bookingsEnabled={bookingsEnabled} />
    </div>
  );
}
