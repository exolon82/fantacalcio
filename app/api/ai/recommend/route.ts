import { NextResponse } from "next/server";
import { askScoutAI } from "@/lib/ai";
import { isStar, scoutPlayers, type ScoutPlayer } from "@/lib/scouting-data";
import { getSerieAPlayers } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

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

const LEAGUE_BUDGET = 250;
const ORIGINAL_PRICE_REFERENCE_BUDGET = 500;

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

async function loadCandidates(): Promise<ScoutPlayer[]> {
  try {
    const rows = await getSerieAPlayers();
    if (!rows.length) return scoutPlayers;
    const mapped: ScoutPlayer[] = rows.map((row) => {
      const appearances = row.appearances ?? 0;
      const starts = row.starts ?? 0;
      const price = Math.round(row.official_quote ?? row.quote_estimate);
      const score = Math.round(row.ds_score);
      const potential = Math.round(row.potential_score);
      const risk = row.current_injured || (row.injuries_count ?? 0) >= 3 ? "Alto" : (row.injuries_count ?? 0) > 0 || appearances < 8 ? "Medio" : "Basso";
      return {
        id: row.provider_id,
        name: row.name,
        role: row.role,
        club: row.team_name,
        clubCode: row.team_code ?? row.team_name.slice(0, 3).toUpperCase(),
        age: row.age ?? 28,
        price,
        priceDelta: 0,
        score,
        form: score,
        starter: appearances ? Math.round((starts / appearances) * 100) : 45,
        risk,
        goals: row.goals ?? 0,
        assists: row.assists ?? 0,
        shots: appearances ? Number(((row.shots_on ?? 0) / appearances).toFixed(2)) : 0,
        passes: appearances ? Number(((row.passes_total ?? 0) / appearances).toFixed(1)) : 0,
        dribbles: appearances ? Number(((row.dribbles_success ?? 0) / appearances).toFixed(1)) : 0,
        injuries: row.injuries_count ?? 0,
        minutes: row.minutes ?? 0,
        trend: [Math.max(0, score - 7), Math.max(0, score - 5), Math.max(0, score - 3), Math.max(0, score - 2), score, potential],
        verdict: score >= 82 && price <= 30 ? "Compra" : score >= 68 ? "Tratta" : "Aspetta",
        ceiling: row.age && row.age <= 23 ? `Potenziale ${potential}/100` : `DS score ${score}/100`,
        why: row.age && row.age <= 23 ? `Giovane da ${potential}/100 di potenziale: valutare minuti, prezzo e crescita.` : `Profilo valutato su rendimento, titolarità, disponibilità e costo.`,
        watch: row.current_injured ? row.injury_note ?? "Condizione fisica da verificare" : "Gerarchie e prezzo d’asta",
        news: row.official_quote ? "Quotazione ufficiale disponibile" : "Quota stimata UNDICI, in attesa del Listone ufficiale",
        newsTone: row.current_injured ? "down" : row.age && row.age <= 23 ? "up" : "flat",
      };
    });
    const top = [...mapped].sort((a, b) => b.score - a.score).slice(0, 55);
    const value = [...mapped].sort((a, b) => (b.score + potential(b) - b.price * 1.5) - (a.score + potential(a) - a.price * 1.5)).slice(0, 45);
    const youth = [...mapped].filter((player) => player.age <= 25).sort((a, b) => potential(b) - potential(a)).slice(0, 45);
    return [...new Map([...top, ...value, ...youth].map((player) => [player.id, player])).values()].slice(0, 70);
  } catch {
    return scoutPlayers;
  }
}

function potential(player: ScoutPlayer) {
  const youthBonus = player.age <= 21 ? 14 : player.age <= 23 ? 10 : player.age <= 25 ? 5 : 0;
  return Math.min(99, player.score + youthBonus);
}

function toPick(player: ScoutPlayer, tier: Pick["tier"], budgetFactor = 1): Pick {
  return {
    player: player.name, role: player.role, tier,
    maxBid: Math.max(1, Math.round((player.price + (player.score >= 85 ? 2 : 0)) * budgetFactor)),
    reason: player.why,
    risk: player.injuries >= 3 || player.starter < 50 ? "Alto" : player.injuries > 0 || player.starter < 75 ? "Medio" : "Basso",
  };
}

function fallbackPlan(budget: number, formation: string, candidates: ScoutPlayer[]): AiPlan {
  const factor = budget / ORIGINAL_PRICE_REFERENCE_BUDGET;
  const stars = candidates.filter(isStar).sort((a, b) => b.score - a.score).slice(0, 2).map((player) => toPick(player, "Stella", factor));
  const chosenStars = new Set(stars.map((pick) => pick.player));
  const lowCost = candidates
    .filter((player) => !isStar(player) && !chosenStars.has(player.name))
    .sort((a, b) => (b.score + potential(b) - b.price * 1.7) - (a.score + potential(a) - a.price * 1.7))
    .slice(0, 8)
    .map((player) => toPick(player, "Low-cost", factor));
  const safeStars = stars.length ? stars : scoutPlayers.filter((player) => ["Lautaro Martínez", "Scott McTominay"].includes(player.name)).map((player) => toPick(player, "Stella", factor));
  const safeLowCost = lowCost.length >= 5 ? lowCost : scoutPlayers.filter((player) => ["Mile Svilar", "Alessandro Bastoni", "Giovanni Di Lorenzo", "Christian Pulisic", "Riccardo Orsolini", "Ange-Yoan Bonny"].includes(player.name)).map((player) => toPick(player, "Low-cost", factor));
  return {
    title: "Due leader, il resto è valore",
    formation,
    budget,
    estimatedSpend: [...safeStars, ...safeLowCost].reduce((sum, player) => sum + player.maxBid, 0),
    starsUsed: Math.min(safeStars.length, 2),
    stars: safeStars.slice(0, 2),
    lowCost: safeLowCost,
    tacticalNote: "Blocca due punti fermi e conserva margine per titolari sottovalutati e giovani ad alto potenziale.",
    budgetRule: "Mai più di 2 stelle. Stop al tetto indicato: l’asta si vince sui low-cost, non sul terzo nome di richiamo.",
  };
}

function sanitisePlan(plan: AiPlan | null, budget: number, formation: string, candidates: ScoutPlayer[]): AiPlan {
  if (!plan) return fallbackPlan(budget, formation, candidates);
  const byName = new Map(candidates.map((player) => [player.name.toLocaleLowerCase("it"), player]));
  const validStars = plan.stars.filter((pick) => {
    const player = byName.get(pick.player.toLocaleLowerCase("it"));
    return player && isStar(player);
  }).slice(0, 2).map((pick) => ({ ...pick, tier: "Stella" as const }));
  const starNames = new Set(validStars.map((pick) => pick.player.toLocaleLowerCase("it")));
  const validLowCost = plan.lowCost.filter((pick) => {
    const player = byName.get(pick.player.toLocaleLowerCase("it"));
    return player && !isStar(player) && !starNames.has(pick.player.toLocaleLowerCase("it"));
  }).slice(0, 9).map((pick) => ({ ...pick, tier: "Low-cost" as const }));
  if (validStars.length === 0 || validLowCost.length < 5) return fallbackPlan(budget, formation, candidates);
  const proposedSpend = [...validStars, ...validLowCost].reduce((sum, pick) => sum + pick.maxBid, 0);
  const nucleusLimit = Math.floor(budget * .72);
  const bidFactor = proposedSpend > nucleusLimit ? nucleusLimit / proposedSpend : 1;
  const cappedStars = validStars.map((pick) => ({ ...pick, maxBid: Math.max(1, Math.floor(pick.maxBid * bidFactor)) }));
  const cappedLowCost = validLowCost.map((pick) => ({ ...pick, maxBid: Math.max(1, Math.floor(pick.maxBid * bidFactor)) }));
  return { ...plan, budget, formation, stars: cappedStars, starsUsed: cappedStars.length, lowCost: cappedLowCost, estimatedSpend: [...cappedStars, ...cappedLowCost].reduce((sum, pick) => sum + pick.maxBid, 0) };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { budget?: number; formation?: string; risk?: string };
    const budget = LEAGUE_BUDGET;
    const formation = ["3-4-3", "3-5-2", "4-3-3", "4-4-2"].includes(body.formation ?? "") ? body.formation! : "3-4-3";
    const risk = ["Prudente", "Equilibrato", "Aggressivo"].includes(body.risk ?? "") ? body.risk! : "Equilibrato";
    const candidates = await loadCandidates();
    const configuredModel = process.env.OPENAI_SCOUT_MODEL?.trim();
    const scoutModel = configuredModel?.startsWith("gpt-") ? configuredModel : "gpt-5.6-sol";
    const generated = await askScoutAI<AiPlan>({
      model: scoutModel,
      reasoningEffort: "low",
      timeoutMs: 80000,
      schema: planSchema,
      schemaName: "fantacalcio_auction_plan",
      instructions: "Agisci come un Direttore Sportivo esperto di fantacalcio. Il budget della lega è fisso e non negoziabile: 250 crediti. Ottimizza il valore, non collezionare nomi famosi. Vincolo assoluto: massimo 2 stelle complessive. Tutti gli altri suggerimenti devono essere low-cost. Scegli solo giocatori presenti nei dati, rispetta il budget, diversifica i ruoli e valorizza giovani Under 23/25 con reali possibilità di minuti. Considera gol, assist, tiri, passaggi, dribbling, infortuni, titolarità, prezzo e potenziale. La quota può essere una stima UNDICI finché quella ufficiale non è disponibile: non confonderle. Scrivi in italiano, indica tetti disciplinati e non promettere risultati.",
      input: { budget, formation, riskProfile: risk, hardConstraints: { maximumStars: 2, allOtherPicks: "low-cost", neverExceedBudget: true }, players: candidates.map((player) => ({ ...player, potential: potential(player), tier: isStar(player) ? "Stella" : "Low-cost" })) },
    });
    return NextResponse.json({ plan: sanitisePlan(generated, budget, formation, candidates), source: generated ? "openai" : "simulazione", model: generated ? scoutModel : null, candidateCount: candidates.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore AI" }, { status: 500 });
  }
}
