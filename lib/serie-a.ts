export type SerieARole = "P" | "D" | "C" | "A";

export type SerieAPlayerRecord = {
  provider_id: number;
  name: string;
  firstname?: string | null;
  lastname?: string | null;
  age?: number | null;
  birth_date?: string | null;
  nationality?: string | null;
  height?: string | null;
  weight?: string | null;
  photo_url?: string | null;
  role: SerieARole;
  position?: string | null;
  shirt_number?: number | null;
  team_id: number;
  team_name: string;
  team_code?: string | null;
  team_logo?: string | null;
  stats_season?: number | null;
  appearances?: number | null;
  starts?: number | null;
  minutes?: number | null;
  rating?: number | null;
  goals?: number | null;
  assists?: number | null;
  shots_total?: number | null;
  shots_on?: number | null;
  passes_total?: number | null;
  key_passes?: number | null;
  pass_accuracy?: number | null;
  dribbles_attempts?: number | null;
  dribbles_success?: number | null;
  tackles?: number | null;
  current_injured?: boolean | null;
  injuries_count?: number | null;
  injury_note?: string | null;
  quote_estimate: number;
  official_quote?: number | null;
  official_fvm?: number | null;
  official_role?: string | null;
  ds_score: number;
  potential_score: number;
  raw?: unknown;
  updated_at?: string;
};

export type SerieAPlayer = {
  id: number;
  name: string;
  age: number | null;
  nationality: string | null;
  photoUrl: string | null;
  role: SerieARole;
  position: string | null;
  shirtNumber: number | null;
  teamId: number;
  team: string;
  teamCode: string | null;
  teamLogo: string | null;
  statsSeason: number | null;
  appearances: number;
  starts: number;
  minutes: number;
  rating: number | null;
  goals: number;
  assists: number;
  shotsTotal: number;
  shotsOn: number;
  passesTotal: number;
  keyPasses: number;
  passAccuracy: number;
  dribblesAttempts: number;
  dribblesSuccess: number;
  tackles: number;
  injured: boolean;
  injuries: number;
  injuryNote: string | null;
  quoteEstimate: number;
  officialQuote: number | null;
  officialFvm: number | null;
  officialRole: string | null;
  score: number;
  potential: number;
  previousTeam: string | null;
  previousLeague: string | null;
  previousCountry: string | null;
  performanceOrigin: "serie-a" | "incoming-transfer" | null;
  updatedAt: string | null;
};

type PerformanceContext = {
  team?: string | null;
  league?: string | null;
  country?: string | null;
  origin?: "serie-a" | "incoming-transfer" | null;
};

function performanceContext(raw: unknown): PerformanceContext {
  if (!raw || typeof raw !== "object") return {};
  const rawObject = raw as { performanceContext?: unknown; provider?: unknown; statistics?: unknown };
  const context = rawObject.performanceContext;
  if (context && typeof context === "object") return context as PerformanceContext;
  const provider = rawObject.provider && typeof rawObject.provider === "object" ? rawObject.provider as { statistics?: unknown } : rawObject;
  const statistics = Array.isArray(provider.statistics) ? provider.statistics : [];
  const first = statistics[0] as { team?: { name?: string | null }; league?: { id?: number; name?: string | null; country?: string | null } } | undefined;
  if (!first) return {};
  return {
    team: first.team?.name ?? null,
    league: first.league?.name ?? (first.league?.id === 135 ? "Serie A" : null),
    country: first.league?.country ?? null,
    origin: first.league?.id === 135 ? "serie-a" : "incoming-transfer",
  };
}

export function roleFromPosition(position?: string | null): SerieARole {
  const normalised = (position ?? "").toLowerCase();
  if (normalised.includes("goal")) return "P";
  if (normalised.includes("def")) return "D";
  if (normalised.includes("mid")) return "C";
  if (normalised.includes("att") || normalised.includes("forward")) return "A";
  return "C";
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function calculatePlayerScores(player: Partial<SerieAPlayerRecord>) {
  const appearances = player.appearances ?? 0;
  const starts = player.starts ?? 0;
  const minutes = player.minutes ?? 0;
  const goals = player.goals ?? 0;
  const assists = player.assists ?? 0;
  const shotsOn = player.shots_on ?? 0;
  const keyPasses = player.key_passes ?? 0;
  const dribbles = player.dribbles_success ?? 0;
  const tackles = player.tackles ?? 0;
  const rating = player.rating ?? 6.2;
  const age = player.age ?? 28;
  const role = player.role ?? "C";
  const availability = player.current_injured ? 38 : 82;
  const starter = appearances ? clamp((starts / appearances) * 100) : 48;
  const minutesScore = clamp(minutes / 28);
  const ratingScore = clamp((rating - 5) * 38);
  const bonusWeight = role === "P" ? 0 : role === "D" ? goals * 7 + assists * 5 : role === "C" ? goals * 5 + assists * 4 : goals * 4 + assists * 3;
  const activity = clamp(shotsOn * 1.5 + keyPasses * .8 + dribbles * .35 + tackles * .25);
  const dsScore = Math.round(clamp(ratingScore * .24 + starter * .22 + minutesScore * .16 + availability * .16 + clamp(bonusWeight) * .16 + activity * .06));
  const youthBoost = age <= 20 ? 24 : age <= 23 ? 18 : age <= 25 ? 10 : age <= 28 ? 3 : -4;
  const potential = Math.round(clamp(dsScore * .72 + youthBoost + starter * .1 + (player.current_injured ? -8 : 5)));
  const roleBase = role === "P" ? 3 : role === "D" ? 4 : role === "C" ? 6 : 8;
  const quoteEstimate = Math.round(clamp(roleBase + dsScore * .22 + goals * (role === "A" ? 1.1 : .7) + assists * .55 + (age <= 23 ? 3 : 0), 1, 60));
  return { dsScore, potential, quoteEstimate };
}

export function toClientPlayer(row: SerieAPlayerRecord): SerieAPlayer {
  const context = performanceContext(row.raw);
  const officialRole = ["P", "D", "C", "A"].includes(row.official_role ?? "") ? row.official_role as SerieARole : null;
  const hasVerifiedHistory = row.stats_season !== null && row.stats_season !== undefined
    && ((row.appearances ?? 0) > 0 || (row.minutes ?? 0) > 0);
  return {
    id: row.provider_id,
    name: row.name,
    age: row.age ?? null,
    nationality: row.nationality ?? null,
    photoUrl: row.photo_url ?? null,
    role: officialRole ?? row.role,
    position: row.position ?? null,
    shirtNumber: row.shirt_number ?? null,
    teamId: row.team_id,
    team: row.team_name,
    teamCode: row.team_code ?? null,
    teamLogo: row.team_logo ?? null,
    statsSeason: row.stats_season ?? null,
    appearances: row.appearances ?? 0,
    starts: row.starts ?? 0,
    minutes: row.minutes ?? 0,
    rating: row.rating ?? null,
    goals: row.goals ?? 0,
    assists: row.assists ?? 0,
    shotsTotal: row.shots_total ?? 0,
    shotsOn: row.shots_on ?? 0,
    passesTotal: row.passes_total ?? 0,
    keyPasses: row.key_passes ?? 0,
    passAccuracy: row.pass_accuracy ?? 0,
    dribblesAttempts: row.dribbles_attempts ?? 0,
    dribblesSuccess: row.dribbles_success ?? 0,
    tackles: row.tackles ?? 0,
    injured: Boolean(row.current_injured),
    injuries: row.injuries_count ?? 0,
    injuryNote: row.injury_note ?? null,
    quoteEstimate: row.quote_estimate,
    officialQuote: row.official_quote ?? null,
    officialFvm: row.official_fvm ?? null,
    officialRole: row.official_role ?? null,
    score: row.ds_score,
    potential: row.potential_score,
    previousTeam: hasVerifiedHistory ? context.team ?? null : null,
    previousLeague: hasVerifiedHistory ? context.league ?? null : null,
    previousCountry: hasVerifiedHistory ? context.country ?? null : null,
    performanceOrigin: hasVerifiedHistory ? context.origin ?? null : null,
    updatedAt: row.updated_at ?? null,
  };
}
