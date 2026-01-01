import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { PlayerService } from "@/services/player.service";
import { createPlayerSchema } from "@/schemas/player.schema";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validatedData = createPlayerSchema.parse(body);

    const playerService = new PlayerService();
    const player = await playerService.createPlayer(validatedData);

    return NextResponse.json(player, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Error al crear el jugador" },
      { status: 500 }
    );
  }
}


