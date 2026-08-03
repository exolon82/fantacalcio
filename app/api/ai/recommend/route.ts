import { NextResponse } from "next/server";
import { askScoutAI } from "@/lib/ai";
import { scoutPlayers, type ScoutPlayer, type ScoutRole } from "@/lib/scouting-data";
import { getSerieAPlayers } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

type PickTier = "Leader" | "Low-cost" | "Portiere";
type Pick = { player: string; club: string; role: ScoutRole; tier: PickTier; maxBid: number; reason: string; risk: string };
type AiPlan = {
  title: string;
  formation: string;
  budget: number;
  estimatedSpend: number;
  leadersUsed: number;
  goalkeepers: Pick[];
  leaders: Pick[];
  lowCost: Pick[];
  tacticalNote: string;
  budgetRule: string;
};

const LEAGUE_BUDGET = 250;
const ROLE_ORDER: ScoutRole[] = ["P", "D", "C", "A"];
const DEPARTMENT_ROLES: ScoutRole[] = ["D", "C", "A"];
const SQUAD_REQUIREMENTS: Record<ScoutRole, number> = { P: 3, D: 8, C: 8, A: 6 };
const LEADERS_PER_DEPARTMENT = 2;
const LOW_COST_LIMIT = 10;

const pickProperties = {
  player: { type: "string" },
  club: { type: "string" },
  role: { type: "string", enum: ["P", "D", "C", "A"] },
  tier: { type: "string", enum: ["Leader", "Low-cost", "Portiere"] },
  maxBid: { type: "integer", minimum: 1 },
  reason: { type: "string" },
  risk: { type: "string" },
};
const planSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "formation", "budget", "estimatedSpend", "leadersUsed", "goalkeepers", "leaders", "lowCost", "tacticalNote", "budgetRule"],
  properties: {
    title: { type: "string" },
    formation: { type: "string" },
    budget: { type: "integer" },
    estimatedSpend: { type: "integer" },
    leadersUsed: { type: "integer", minimum: 6, maximum: 6 },
    goalkeepers: { type: "array", minItems: 3, maxItems: 3, items: { type: "object", additionalProperties: false, required: Object.keys(pickProperties), properties: pickProperties } },
    leaders: { type: "array", minItems: 6, maxItems: 6, items: { type: "object", additionalProperties: false, required: Object.keys(pickProperties), properties: pickProperties } },
    lowCost: { type: "array", minItems: 16, maxItems: 16, items: { type: "object", additionalProperties: false, required: Object.keys(pickProperties), properties: pickProperties } },
    tacticalNote: { type: "string" },
    budgetRule: { type: "string" },
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
      const potentialScore = Math.round(row.potential_score);
      return {
        id: row.provider_id,
        name: row.name,
        role: row.role,
        club: row.team_name,
        age: row.age ?? 28,
        price,
        score,
        goals: row.goals ?? 0,
        assists: row.assists ?? 0,
        shots: appearances ? Number(((row.shots_on ?? 0) / appearances).toFixed(2)) : 0,
        passes: appearances ? Number(((row.passes_total ?? 0) / appearances).toFixed(1)) : 0,
        dribbles: appearances ? Number(((row.dribbles_success ?? 0) / appearances).toFixed(1)) : 0,
        injuries: row.injuries_count ?? 0,
        starter: appearances ? Math.round((starts / appearances) * 100) : 45,
        news: row.official_quote ? "Quotazione ufficiale disponibile" : "Quota stimata UNDICI, in attesa del Listone ufficiale",
        why: row.age && row.age <= 20
          ? `Proiezione giovane ${potentialScore}/100: minuti e crescita da verificare nel precampionato.`
          : `Profilo valutato su rendimento, titolarità, disponibilità e costo.`,
        youthNationalTeam: null,
      };
    });
    const roleLimits: Record<ScoutRole, number> = { P: 18, D: 38, C: 38, A: 30 };
    return ROLE_ORDER.flatMap((role) => mapped
      .filter((player) => player.role === role)
      .sort((a, b) => futureStarRank(b) - futureStarRank(a))
      .slice(0, roleLimits[role]));
  } catch {
    return scoutPlayers;
  }
}

function potential(player: ScoutPlayer) {
  const youthBonus = player.age <= 18 ? 20 : player.age <= 19 ? 17 : player.age <= 21 ? 14 : player.age <= 23 ? 10 : player.age <= 25 ? 5 : 0;
  const nationalBonus = player.youthNationalTeam ? 10 : 0;
  return Math.min(99, player.score + youthBonus + nationalBonus);
}

function leaderRank(player: ScoutPlayer) {
  return player.score * 1.35 + player.starter * .45 + player.goals * 2.4 + player.assists * 1.7 - player.injuries * 5;
}

function futureStarRank(player: ScoutPlayer) {
  const ageBonus = player.age <= 18 ? 30 : player.age <= 19 ? 25 : player.age <= 21 ? 18 : player.age <= 23 ? 11 : 0;
  const nationalBonus = player.youthNationalTeam ? 24 : 0;
  return potential(player) * 1.25 + player.starter * .25 + ageBonus + nationalBonus - player.price * 1.8 - player.injuries * 5;
}

function riskLabel(player: ScoutPlayer) {
  return player.injuries >= 3 || player.starter < 45 ? "Alto" : player.injuries > 0 || player.starter < 72 ? "Medio" : "Basso";
}

function basePick(player: ScoutPlayer, tier: PickTier, reason?: string): Pick {
  const lowCostReason = player.youthNationalTeam
    ? `Segnale ${player.youthNationalTeam}: ${player.why}`
    : player.age <= 19
      ? `Profilo Under ${player.age + 1} ad alta proiezione; convocazioni giovanili da verificare. ${player.why}`
      : player.price > LOW_COST_LIMIT
        ? `Da prendere solo se resta entro 10 crediti. ${player.why}`
        : player.why;
  return {
    player: player.name,
    club: player.club,
    role: player.role,
    tier,
    maxBid: tier === "Low-cost" ? Math.min(LOW_COST_LIMIT, Math.max(1, player.price)) : Math.max(1, player.price),
    reason: reason ?? (tier === "Low-cost" ? lowCostReason : player.why),
    risk: riskLabel(player),
  };
}

function chooseGoalkeepers(pool: ScoutPlayer[], selected: Set<string>): Pick[] {
  const goalkeepers = pool.filter((player) => player.role === "P");
  const byClub = new Map<string, ScoutPlayer[]>();
  for (const player of goalkeepers) byClub.set(player.club, [...(byClub.get(player.club) ?? []), player]);
  const pairedClubs = [...byClub.entries()]
    .filter(([, players]) => players.length >= 2)
    .map(([club, players]) => ({ club, players: [...players].sort((a, b) => leaderRank(b) - leaderRank(a)) }))
    .sort((a, b) => leaderRank(b.players[0]) - leaderRank(a.players[0]));
  const pair = pairedClubs[0]?.players.slice(0, 2) ?? goalkeepers.sort((a, b) => leaderRank(b) - leaderRank(a)).slice(0, 2);
  for (const player of pair) selected.add(player.name.toLocaleLowerCase("it"));
  const third = goalkeepers
    .filter((player) => !selected.has(player.name.toLocaleLowerCase("it")))
    .sort((a, b) => futureStarRank(b) - futureStarRank(a))[0];
  if (third) selected.add(third.name.toLocaleLowerCase("it"));
  const chosen = [...pair, ...(third ? [third] : [])].slice(0, SQUAD_REQUIREMENTS.P);
  return chosen.map((player, index) => basePick(
    player,
    "Portiere",
    index === 0
      ? `Prima scelta del pacchetto ${player.club}.`
      : index === 1 && player.club === chosen[0]?.club
        ? `Vice obbligatorio di ${chosen[0].name}: stessa squadra, copertura garantita.`
        : `Terzo portiere scelto per copertura, costo e possibilità di minuti.`,
  ));
}

function rebalanceSpend(goalkeepers: Pick[], leaders: Pick[], lowCost: Pick[], targetSpend: number) {
  const balancedGoalkeepers = goalkeepers.map((pick, index) => ({ ...pick, maxBid: index === 0 ? Math.max(5, pick.maxBid) : Math.min(index === 1 ? 3 : 5, pick.maxBid) }));
  const balancedLeaders = leaders.map((pick) => ({ ...pick, maxBid: Math.max(12, pick.maxBid) }));
  const balancedLowCost = lowCost.map((pick) => ({ ...pick, maxBid: Math.min(LOW_COST_LIMIT, Math.max(1, pick.maxBid)) }));
  let currentSpend = [...balancedGoalkeepers, ...balancedLeaders, ...balancedLowCost].reduce((sum, pick) => sum + pick.maxBid, 0);
  let difference = targetSpend - currentSpend;
  let cursor = 0;
  while (difference > 0 && balancedLeaders.length) {
    balancedLeaders[cursor % balancedLeaders.length].maxBid += 1;
    difference -= 1;
    cursor += 1;
  }
  cursor = 0;
  while (difference < 0 && balancedLeaders.some((pick) => pick.maxBid > 12)) {
    const pick = balancedLeaders[cursor % balancedLeaders.length];
    if (pick.maxBid > 12) {
      pick.maxBid -= 1;
      difference += 1;
    }
    cursor += 1;
  }
  cursor = 0;
  while (difference < 0 && balancedLowCost.some((pick) => pick.maxBid > 1)) {
    const pick = balancedLowCost[cursor % balancedLowCost.length];
    if (pick.maxBid > 1) {
      pick.maxBid -= 1;
      difference += 1;
    }
    cursor += 1;
  }
  currentSpend = [...balancedGoalkeepers, ...balancedLeaders, ...balancedLowCost].reduce((sum, pick) => sum + pick.maxBid, 0);
  return { goalkeepers: balancedGoalkeepers, leaders: balancedLeaders, lowCost: balancedLowCost, estimatedSpend: currentSpend };
}

function sanitisePlan(plan: AiPlan | null, budget: number, formation: string, risk: string, candidates: ScoutPlayer[]): AiPlan {
  const pool = [...new Map([...candidates, ...scoutPlayers].map((player) => [player.name.toLocaleLowerCase("it"), player])).values()];
  const proposed = new Map([...(plan?.leaders ?? []), ...(plan?.lowCost ?? [])].map((pick) => [pick.player.toLocaleLowerCase("it"), pick]));
  const selected = new Set<string>();
  const goalkeepers = chooseGoalkeepers(pool, selected);

  const leaderPlayers: ScoutPlayer[] = [];
  for (const role of DEPARTMENT_ROLES) {
    const candidatesForRole = pool.filter((player) => player.role === role).sort((a, b) => leaderRank(b) - leaderRank(a));
    for (const player of candidatesForRole) {
      if (leaderPlayers.filter((item) => item.role === role).length >= LEADERS_PER_DEPARTMENT) break;
      const key = player.name.toLocaleLowerCase("it");
      if (selected.has(key)) continue;
      selected.add(key);
      leaderPlayers.push(player);
    }
  }

  const lowCostPlayers: ScoutPlayer[] = [];
  for (const role of DEPARTMENT_ROLES) {
    const needed = SQUAD_REQUIREMENTS[role] - LEADERS_PER_DEPARTMENT;
    const roleCandidates = pool
      .filter((player) => player.role === role && !selected.has(player.name.toLocaleLowerCase("it")))
      .sort((a, b) => Number(b.price <= LOW_COST_LIMIT) - Number(a.price <= LOW_COST_LIMIT)
        || Number(Boolean(b.youthNationalTeam)) - Number(Boolean(a.youthNationalTeam))
        || Number(proposed.has(b.name.toLocaleLowerCase("it"))) - Number(proposed.has(a.name.toLocaleLowerCase("it")))
        || futureStarRank(b) - futureStarRank(a));
    for (const player of roleCandidates.slice(0, needed)) {
      selected.add(player.name.toLocaleLowerCase("it"));
      lowCostPlayers.push(player);
    }
  }

  const leaders = leaderPlayers.map((player) => {
    const aiPick = proposed.get(player.name.toLocaleLowerCase("it"));
    return basePick(player, "Leader", aiPick?.reason);
  });
  const lowCost = lowCostPlayers.map((player) => {
    const aiPick = proposed.get(player.name.toLocaleLowerCase("it"));
    return basePick(player, "Low-cost", aiPick?.reason);
  });
  const targetSpend = risk === "Aggressivo" ? budget : risk === "Equilibrato" ? 215 : 200;
  const balanced = rebalanceSpend(goalkeepers, leaders, lowCost, targetSpend);

  return {
    title: plan?.title || "Sei leader, una rosa completa",
    formation,
    budget,
    estimatedSpend: balanced.estimatedSpend,
    leadersUsed: balanced.leaders.length,
    goalkeepers: balanced.goalkeepers,
    leaders: balanced.leaders,
    lowCost: balanced.lowCost,
    tacticalNote: `Rosa da 25 giocatori: 3 portieri, 8 difensori, 8 centrocampisti e 6 attaccanti. Il ${formation} resta il modulo base degli undici titolari.`,
    budgetRule: `Due leader per difesa, centrocampo e attacco. Tutti i ${balanced.lowCost.length} profili low-cost hanno un tetto massimo di 10 crediti; i segnali Under 18/19 aumentano la priorità solo quando verificabili.`,
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
      instructions: "Agisci come Direttore Sportivo esperto di fantacalcio. Costruisci una rosa completa da 25 giocatori: 3 portieri, 8 difensori, 8 centrocampisti e 6 attaccanti. Scegli esattamente 2 leader in difesa, 2 a centrocampo e 2 in attacco. Per i portieri inserisci obbligatoriamente titolare e vice della stessa squadra, più un terzo portiere. Gli altri 16 giocatori devono essere low-cost con tetto massimo di 10 crediti, anche da 1 credito. Premia potenziale, minuti probabili, età, rendimento, integrità fisica e segnali verificati delle nazionali Under 18/19; non inventare convocazioni giovanili mancanti. Il profilo Aggressivo deve usare tutti i 250 crediti. Scrivi in italiano e non promettere risultati.",
      input: {
        budget,
        formation,
        riskProfile: risk,
        hardConstraints: { squadSize: 25, roles: SQUAD_REQUIREMENTS, leadersByRole: { D: 2, C: 2, A: 2 }, goalkeeperPairSameClub: true, lowCostMaximumBid: 10, aggressiveExactSpend: 250 },
        players: candidates.map((player) => ({ ...player, potential: potential(player), futureStarScore: Math.round(futureStarRank(player)) })),
      },
    });
    return NextResponse.json({ plan: sanitisePlan(generated, budget, formation, risk, candidates), source: generated ? "openai" : "simulazione", model: generated ? scoutModel : null, candidateCount: candidates.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore AI" }, { status: 500 });
  }
}
