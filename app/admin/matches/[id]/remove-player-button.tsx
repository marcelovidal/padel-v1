import { removePlayerFromMatchAction } from "../actions";
import { Button } from "@/components/ui/button";

export function RemovePlayerButton({
  matchId,
  playerId,
}: {
  matchId: string;
  playerId: string;
}) {
  async function handleRemove() {
    "use server";
    await removePlayerFromMatchAction(matchId, playerId);
  }

  return (
    <form action={handleRemove}>
      <Button type="submit" variant="outline" size="sm">
        Quitar
      </Button>
    </form>
  );
}

