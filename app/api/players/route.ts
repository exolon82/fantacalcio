import { NextResponse } from "next/server";
import { getSerieAPlayers } from "@/lib/supabase";
import { scoutPlayers } from "@/lib/scouting-data";
import { toClientPlayer, type SerieAPlayer } from "@/lib/serie-a";

export const dynamic = "force-dynamic";

function demoPlayers(): SerieAPlayer[] {
  return scoutPlayers.map((player) => ({
    id: player.id,
    name: player.name,
    age: player.age,
    nationality: null,
    photoUrl: null,
    role: player.role,
    position: null,
    shirtNumber: null,
    teamId: player.id,
    team: player.club,
    teamCode: null,
    teamLogo: null,
    statsSeason: 2025,
    appearances: Math.round(player.starter / 3),
    starts: Math.round(player.starter / 3.5),
    minutes: 0,
    rating: null,
    goals: player.goals,
    assists: player.assists,
    shotsTotal: Math.round(player.shots * 20),
    shotsOn: Math.round(player.shots * 10),
    passesTotal: Math.round(player.passes * 20),
    keyPasses: 0,
    passAccuracy: 0,
    dribblesAttempts: Math.round(player.dribbles * 20),
    dribblesSuccess: Math.round(player.dribbles * 10),
    tackles: 0,
    injured: false,
    injuries: player.injuries,
    injuryNote: null,
    quoteEstimate: player.price,
    officialQuote: null,
    officialFvm: null,
    officialRole: null,
    score: player.score,
    potential: player.age <= 23 ? Math.min(99, player.score + 10) : player.score,
    updatedAt: null,
  }));
}

export async function GET() {
  try {
    const rows = await getSerieAPlayers();
    if (!rows.length) return NextResponse.json({ players: demoPlayers(), source: "demo", total: 12, syncedAt: null, message: "La prima sincronizzazione della rosa completa è in attesa." });
    const players = rows.map(toClientPlayer);
    const syncedAt = players.map((player) => player.updatedAt).filter(Boolean).sort().at(-1) ?? null;
    return NextResponse.json({ players, source: "api-football", total: players.length, syncedAt });
  } catch (error) {
    return NextResponse.json({ players: demoPlayers(), source: "demo", total: 12, syncedAt: null, message: error instanceof Error ? error.message : "Database giocatori non disponibile" });
  }
}

