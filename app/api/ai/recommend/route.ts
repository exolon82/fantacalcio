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
const STARTING_ELEVEN_SIZE = 11;
const ROLE_ORDER = ["P", "D", "C", "A"] as const;
const FORMATION_ROLES: Record<string, Record<(typeof ROLE_ORDER)[number], number>> = {
  "3-4-3": { P: 1, D: 3, C: 4, A: 3 },
  "3-5-2": { P: 1, D: 3, C: 5, A: 2 },
  "4-3-3": { P: 1, D: 4, C: 3, A: 3 },
  "4-4-2": { P: 1, D: 4, C: 4, A: 2 },
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
    lowCost: { type: "array", minItems: 9, maxItems: 10, items: { type: "object", additionalProperties: false, required: Object.keys(pickProperties), properties: pickProperties } },
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

function valueRank(player: ScoutPlayer) {
  return player.score + potential(player) + player.starter * .35 - player.price * 1.25 - player.injuries * 4;
}

function balanceSpend(picks: Pick[], targetSpend: number): Pick[] {
  const rawTotal = picks.reduce((sum, pick) => sum + Math.max(1, pick.maxBid), 0);
  if (!rawTotal) return picks;
  const scale = targetSpend / rawTotal;
  const bids = picks.map((pick) => Math.max(1, Math.floor(pick.maxBid * scale)));
  let difference = targetSpend - bids.reduce((sum, bid) => sum + bid, 0);
  const priority = picks.map((_, index) => index).sort((a, b) => picks[b].maxBid - picks[a].maxBid);
  let cursor = 0;
  while (difference !== 0 && priority.length) {
    const index = priority[cursor % priority.length];
    if (difference > 0) {
      bids[index] += 1;
      difference -= 1;
    } else if (bids[index] > 1) {
      bids[index] -= 1;
      difference += 1;
    }
    cursor += 1;
  }
  return picks.map((pick, index) => ({ ...pick, maxBid: bids[index] }));
}

function sanitisePlan(plan: AiPlan | null, budget: number, formation: string, risk: string, candidates: ScoutPlayer[]): AiPlan {
  const pool = [...new Map([...candidates, ...scoutPlayers].map((player) => [player.name.toLocaleLowerCase("it"), player])).values()];
  const byName = new Map(pool.map((player) => [player.name.toLocaleLowerCase("it"), player]));
  const proposedPicks = new Map([...(plan?.stars ?? []), ...(plan?.lowCost ?? [])].map((pick) => [pick.player.toLocaleLowerCase("it"), pick]));
  const selected = new Set<string>();

  const starCandidates = [
    ...(plan?.stars ?? []).map((pick) => byName.get(pick.player.toLocaleLowerCase("it"))).filter((player): player is ScoutPlayer => Boolean(player && isStar(player))),
    ...pool.filter(isStar).sort((a, b) => valueRank(b) - valueRank(a)),
  ];
  const starPlayers = starCandidates.filter((player) => {
    const key = player.name.toLocaleLowerCase("it");
    if (selected.has(key)) return false;
    selected.add(key);
    return true;
  }).slice(0, 2);

  const lowCostPlayers: ScoutPlayer[] = [];
  const requirements = FORMATION_ROLES[formation] ?? FORMATION_ROLES["3-4-3"];
  for (const role of ROLE_ORDER) {
    const starsInRole = starPlayers.filter((player) => player.role === role).length;
    const needed = Math.max(0, requirements[role] - starsInRole);
    const roleCandidates = pool
      .filter((player) => player.role === role && !isStar(player) && !selected.has(player.name.toLocaleLowerCase("it")))
      .sort((a, b) => Number(proposedPicks.has(b.name.toLocaleLowerCase("it"))) - Number(proposedPicks.has(a.name.toLocaleLowerCase("it"))) || valueRank(b) - valueRank(a));
    for (const player of roleCandidates.slice(0, needed)) {
      selected.add(player.name.toLocaleLowerCase("it"));
      lowCostPlayers.push(player);
    }
  }

  const remaining = pool
    .filter((player) => !isStar(player) && !selected.has(player.name.toLocaleLowerCase("it")))
    .sort((a, b) => Number(proposedPicks.has(b.name.toLocaleLowerCase("it"))) - Number(proposedPicks.has(a.name.toLocaleLowerCase("it"))) || valueRank(b) - valueRank(a));
  for (const player of remaining) {
    if (starPlayers.length + lowCostPlayers.length >= STARTING_ELEVEN_SIZE) break;
    selected.add(player.name.toLocaleLowerCase("it"));
    lowCostPlayers.push(player);
  }

  const makePick = (player: ScoutPlayer, tier: Pick["tier"]): Pick => {
    const proposed = proposedPicks.get(player.name.toLocaleLowerCase("it"));
    const baseline = toPick(player, tier);
    return proposed ? { ...baseline, reason: proposed.reason || baseline.reason, risk: proposed.risk || baseline.risk } : baseline;
  };
  const initialStars = starPlayers.map((player) => makePick(player, "Stella"));
  const initialLowCost = lowCostPlayers.slice(0, STARTING_ELEVEN_SIZE - initialStars.length).map((player) => makePick(player, "Low-cost"));
  const targetSpend = risk === "Aggressivo" ? 230 : risk === "Equilibrato" ? 215 : 200;
  const balanced = balanceSpend([...initialStars, ...initialLowCost], Math.min(budget, targetSpend));
  const stars = balanced.slice(0, initialStars.length);
  const lowCost = balanced.slice(initialStars.length);

  return {
    title: plan?.title || "Due leader, il resto è valore",
    formation,
    budget,
    estimatedSpend: balanced.reduce((sum, pick) => sum + pick.maxBid, 0),
    starsUsed: stars.length,
    stars,
    lowCost,
    tacticalNote: `Undici titolari nel ${formation}: ruoli completi, due punti fermi e una struttura di valore con tetti d’asta già calibrati.`,
    budgetRule: `Formazione completa da 11 titolari: almeno 200 crediti investiti, massimo 2 stelle e ${budget - targetSpend} crediti protetti per rilanci e correzioni.`,
  };
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
      instructions: "Agisci come un Direttore Sportivo esperto di fantacalcio. Il budget della lega è fisso e non negoziabile: 250 crediti. Genera sempre una formazione titolare completa di 11 giocatori, coerente con il modulo richiesto, e investi almeno 200 crediti. Vincolo assoluto: massimo 2 stelle complessive. Tutti gli altri suggerimenti devono essere low-cost. Scegli solo giocatori presenti nei dati, rispetta il budget e valorizza giovani Under 23/25 con reali possibilità di minuti. Considera gol, assist, tiri, passaggi, dribbling, infortuni, titolarità, prezzo e potenziale. La quota può essere una stima UNDICI finché quella ufficiale non è disponibile: non confonderle. Scrivi in italiano, indica tetti disciplinati e non promettere risultati.",
      input: { budget, formation, riskProfile: risk, hardConstraints: { startingPlayers: 11, minimumSpend: 200, maximumStars: 2, allOtherPicks: "low-cost", neverExceedBudget: true }, players: candidates.map((player) => ({ ...player, potential: potential(player), tier: isStar(player) ? "Stella" : "Low-cost" })) },
    });
    return NextResponse.json({ plan: sanitisePlan(generated, budget, formation, risk, candidates), source: generated ? "openai" : "simulazione", model: generated ? scoutModel : null, candidateCount: candidates.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore AI" }, { status: 500 });
  }
}
