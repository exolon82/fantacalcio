import { NextResponse } from "next/server";
import { syncPlayerPreviousSeason } from "@/lib/api-football";
import { toClientPlayer } from "@/lib/serie-a";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const playerId = Number(id);
  if (!Number.isInteger(playerId) || playerId <= 0) {
    return NextResponse.json({ error: "Identificativo giocatore non valido" }, { status: 400 });
  }

  try {
    const result = await syncPlayerPreviousSeason(playerId);
    return NextResponse.json({
      player: toClientPlayer(result.player),
      fetched: result.fetched,
      statsSeason: result.statsSeason,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Statistiche non disponibili";
    const status = message.includes("non trovato") ? 404 : message.includes("API-Football") ? 503 : 422;
    return NextResponse.json({ error: message }, { status });
  }
}
