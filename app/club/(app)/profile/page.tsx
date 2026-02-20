import { requireClub } from "@/lib/auth";
import { resolveAvatarSrc } from "@/lib/avatar-server.utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClubProfileForm } from "@/components/club/ClubProfileForm";

export default async function ClubProfilePage() {
  const { user, club } = await requireClub();
  const avatarData = await resolveAvatarSrc({
    player: {
      avatar_url: club.avatar_url,
      display_name: club.name,
    },
  });

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Perfil del Club</h1>
        <p className="text-gray-600">Edita informacion publica y datos de contacto del club.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del Club</CardTitle>
        </CardHeader>
        <CardContent>
          <ClubProfileForm club={club} userId={user.id} currentAvatarSrc={avatarData.src} />
        </CardContent>
      </Card>
    </div>
  );
}
