import { NextResponse } from "next/server";
import { askScoutAI } from "@/lib/ai";
import { isStar, scoutPlayers, type ScoutPlayer } from "@/lib/scouting-data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Pick = { player: string; role: string; tier: "Stella" | "Low-cost"; maxBid: number; reason: string; risk: string };
type AiPlan = {
  title: string;
  formation: string;
  budget: number;
  estimatedSpend: number;
  starsUsed: number;
  stars: Pick[];
  lowCost: Pick[];
  tacticalNote: string;
  budgetRule: string;
};

const pickProperties = {
  player: { type: "string" }, role: { type: "string", enum: ["P", "D", "C", "A"] }, tier: { type: "string", enum: ["Stella", "Low-cost"] }, maxBid: { type: "integer", minimum: 1 }, reason: { type: "string" }, risk: { type: "string" },
};
const planSchema = {
  type: "object", additionalProperties: false,
  required: ["title", "formation", "budget", "estimatedSpend", "starsUsed", "stars", "lowCost", "tacticalNote", "budgetRule"],
  properties: {
    title: { type: "string" }, formation: { type: "string" }, budget: { type: "integer" }, estimatedSpend: { type: "integer" }, starsUsed: { type: "integer", minimum: 0, maximum: 2 },
    stars: { type: "array", maxItems: 2, items: { type: "object", additionalProperties: false, required: Object.keys(pickProperties), properties: pickProperties } },
    lowCost: { type: "array", minItems: 5, maxItems: 9, items: { type: "object", additionalProperties: false, required: Object.keys(pickProperties), properties: pickProperties } },
    tacticalNote: { type: "string" }, budgetRule: { type: "string" },
  },
};

function toPick(player: ScoutPlayer, tier: Pick["tier"], budgetFactor = 1): Pick {
  return {
    player: player.name, role: player.role, tier,
    maxBid: Math.max(1, Math.round((player.price + (player.score >= 85 ? 2 : 0)) * budgetFactor)),
    reason: player.why,
    risk: player.injuries >= 3 ? "Alto" : player.injuries >= 1 || player.starter < 75 ? "Medio" : "Basso",
  };
}

function fallbackPlan(budget: number, formation: string): AiPlan {
  const factor = budget / 500;
  const starNames = new Set(["Lautaro Martínez", "Scott McTominay"]);
  const stars = scoutPlayers.filter((player) => starNames.has(player.name)).map((player) => toPick(player, "Stella", factor));
  const coreNames = new Set(["Mile Svilar", "Alessandro Bastoni", "Giovanni Di Lorenzo", "Christian Pulisic", "Riccardo Orsolini", "Ange-Yoan Bonny"]);
  const lowCost = scoutPlayers.filter((player) => coreNames.has(player.name)).map((player) => toPick(player, "Low-cost", factor));
  return {
    title: "Due leader, il resto è valore",
    formation,
    budget,
    estimatedSpend: [...stars, ...lowCost].reduce((sum, player) => sum + player.maxBid, 0),
    starsUsed: stars.length,
    stars,
    lowCost,
    tacticalNote: "Blocca due punti fermi e conserva margine per completare la rosa con titolari sottovalutati e un giovane ad alto potenziale.",
    budgetRule: "Mai più di 2 stelle. Stop immediato al tetto indicato: l’asta si vince sui low-cost, non sul terzo nome di richiamo.",
  };
}

function sanitisePlan(plan: AiPlan | null, budget: number, formation: string): AiPlan {
  if (!plan) return fallbackPlan(budget, formation);
  const byName = new Map(scoutPlayers.map((player) => [player.name.toLocaleLowerCase("it"), player]));
  const validStars = plan.stars.filter((pick) => {
    const player = byName.get(pick.player.toLocaleLowerCase("it"));
    return player && isStar(player);
  }).slice(0, 2).map((pick) => ({ ...pick, tier: "Stella" as const }));
  const starNames = new Set(validStars.map((pick) => pick.player.toLocaleLowerCase("it")));
  const validLowCost = plan.lowCost.filter((pick) => {
    const player = byName.get(pick.player.toLocaleLowerCase("it"));
    return player && !isStar(player) && !starNames.has(pick.player.toLocaleLowerCase("it"));
  }).slice(0, 9).map((pick) => ({ ...pick, tier: "Low-cost" as const }));
  if (validStars.length === 0 || validLowCost.length < 5) return fallbackPlan(budget, formation);
  const proposedSpend = [...validStars, ...validLowCost].reduce((sum, pick) => sum + pick.maxBid, 0);
  const nucleusLimit = Math.floor(budget * 0.72);
  const bidFactor = proposedSpend > nucleusLimit ? nucleusLimit / proposedSpend : 1;
  const cappedStars = validStars.map((pick) => ({ ...pick, maxBid: Math.max(1, Math.floor(pick.maxBid * bidFactor)) }));
  const cappedLowCost = validLowCost.map((pick) => ({ ...pick, maxBid: Math.max(1, Math.floor(pick.maxBid * bidFactor)) }));
  return { ...plan, budget, formation, stars: cappedStars, starsUsed: cappedStars.length, lowCost: cappedLowCost, estimatedSpend: [...cappedStars, ...cappedLowCost].reduce((sum, pick) => sum + pick.maxBid, 0) };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { budget?: number; formation?: string; risk?: string };
    const budget = Math.min(1000, Math.max(100, Math.round(Number(body.budget) || 500)));
    const formation = ["3-4-3", "3-5-2", "4-3-3", "4-4-2"].includes(body.formation ?? "") ? body.formation! : "3-4-3";
    const risk = ["Prudente", "Equilibrato", "Aggressivo"].includes(body.risk ?? "") ? body.risk! : "Equilibrato";

    const generated = await askScoutAI<AiPlan>({
      model: process.env.OPENAI_SCOUT_MODEL ?? "gpt-5.6-sol",
      schema: planSchema,
      schemaName: "fantacalcio_auction_plan",
      instructions: "Agisci come un Direttore Sportivo esperto di fantacalcio. Devi ottimizzare il valore, non collezionare nomi famosi. Vincolo assoluto: massimo 2 stelle complessive. Una stella ha quota >=35 o DS score >=92. Tutti gli altri suggerimenti devono essere low-cost e non possono essere stelle mascherate. Scegli solo giocatori presenti nei dati, rispetta il budget, diversifica i ruoli, considera gol, assist, tiri, passaggi, dribbling, infortuni, titolarità, prezzo e notizie. Scrivi in italiano, indica tetti d'asta disciplinati e non promettere risultati.",
      input: { budget, formation, riskProfile: risk, hardConstraints: { maximumStars: 2, allOtherPicks: "low-cost", neverExceedBudget: true }, players: scoutPlayers.map((player) => ({ ...player, tier: isStar(player) ? "Stella" : "Low-cost" })) },
    });

    return NextResponse.json({ plan: sanitisePlan(generated, budget, formation), source: generated ? "openai" : "simulazione", model: generated ? (process.env.OPENAI_SCOUT_MODEL ?? "gpt-5.6-sol") : null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore AI" }, { status: 500 });
  }
}
