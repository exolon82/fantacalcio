import { calculatePlayerScores, roleFromPosition, type SerieAPlayerRecord } from "./serie-a";
import { getSerieAPlayers, upsertSerieAPlayers } from "./supabase";

const API_BASE = "https://v3.football.api-sports.io";
const SERIE_A_LEAGUE_ID = 135;

type ApiResponse<T> = {
  response: T;
  paging?: { current: number; total: number };
  errors?: Record<string, string> | string[];
};

type ApiTeam = { team: { id: number; name: string; code?: string | null; country?: string | null; logo?: string | null } };
type ApiSquad = { team: { id: number; name: string; logo?: string | null }; players: Array<{ id: number; name: string; age?: number | null; number?: number | null; position?: string | null; photo?: string | null }> };
type ApiPlayerStats = {
  player: { id: number; name: string; firstname?: string | null; lastname?: string | null; age?: number | null; birth?: { date?: string | null }; nationality?: string | null; height?: string | null; weight?: string | null; injured?: boolean; photo?: string | null };
  statistics: Array<{
    team?: { id?: number; name?: string; logo?: string };
    league?: { id?: number; name?: string; country?: string; season?: number };
    games?: { appearences?: number | null; lineups?: number | null; minutes?: number | null; position?: string | null; rating?: string | null };
    shots?: { total?: number | null; on?: number | null };
    goals?: { total?: number | null; assists?: number | null };
    passes?: { total?: number | null; key?: number | null; accuracy?: number | null };
    tackles?: { total?: number | null };
    dribbles?: { attempts?: number | null; success?: number | null };
  }>;
};

type ApiInjury = { player?: { id?: number; name?: string }; type?: string; reason?: string };
type ApiTransfer = {
  player?: { id?: number; name?: string };
  update?: string;
  transfers?: Array<{
    date?: string;
    type?: string;
    teams?: {
      in?: { id?: number; name?: string; logo?: string };
      out?: { id?: number; name?: string; logo?: string };
    };
  }>;
};
type ApiStatistic = ApiPlayerStats["statistics"][number];

// Partecipanti ufficiali 2026/27 pubblicati da Lega Serie A.
// La lista evita che i limiti stagionali del piano API gratuito nascondano le neopromosse.
const CURRENT_SERIE_A_TEAMS = [
  "Atalanta", "Sassuolo", "Bologna", "Lazio", "Frosinone", "Juventus", "Genoa", "Napoli", "Inter", "Monza",
  "Parma", "Cagliari", "Roma", "Fiorentina", "Torino", "Milan", "Udinese", "Como", "Venezia", "Lecce",
] as const;

const TEAM_ALIASES: Record<string, string[]> = {
  Inter: ["inter", "inter milan", "internazionale"],
  Milan: ["milan", "ac milan"],
  Monza: ["monza", "ac monza"],
  Roma: ["roma", "as roma"],
  Lazio: ["lazio", "ss lazio"],
  Lecce: ["lecce", "us lecce"],
  Fiorentina: ["fiorentina", "acf fiorentina"],
};

function season() {
  const configured = Number(process.env.SERIE_A_SEASON);
  if (Number.isInteger(configured) && configured > 2020) return configured;
  const now = new Date();
  return now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

function previousSeason() {
  return season() - 1;
}

function apiKey() {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY non configurata");
  return key;
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function request<T>(path: string, waitBefore = false): Promise<ApiResponse<T>> {
  if (waitBefore) await wait(Number(process.env.API_FOOTBALL_INTERVAL_MS) || 6300);
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "x-apisports-key": apiKey() },
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error(`API-Football ${response.status}`);
  const payload = (await response.json()) as ApiResponse<T>;
  const errors = payload.errors;
  if (Array.isArray(errors) ? errors.length : errors && Object.keys(errors).length) {
    throw new Error(`API-Football: ${JSON.stringify(errors).slice(0, 240)}`);
  }
  return payload;
}

function matchesOfficialTeam(apiName: string, officialName: string) {
  const normalised = apiName.toLocaleLowerCase("it").trim();
  return (TEAM_ALIASES[officialName] ?? [officialName.toLocaleLowerCase("it")]).includes(normalised);
}

async function resolveCurrentSerieATeams() {
  // Il 2024 è incluso nel piano gratuito e fornisce quasi tutti gli ID permanenti.
  // Per le sole squadre mancanti usiamo la ricerca per nome, che non richiede una stagione.
  const discoverySeason = Number(process.env.API_FOOTBALL_DISCOVERY_SEASON) || 2024;
  const historical = await request<ApiTeam[]>(`/teams?league=${SERIE_A_LEAGUE_ID}&season=${discoverySeason}`);
  const teams: ApiTeam[] = [];
  let calls = 1;
  for (const officialName of CURRENT_SERIE_A_TEAMS) {
    let match = historical.response.find((entry) => matchesOfficialTeam(entry.team.name, officialName));
    if (!match) {
      const searched = await request<ApiTeam[]>(`/teams?search=${encodeURIComponent(officialName)}`, true);
      calls += 1;
      match = searched.response.find((entry) => (!entry.team.country || entry.team.country === "Italy") && matchesOfficialTeam(entry.team.name, officialName));
    }
    if (match) teams.push(match);
  }
  if (teams.length !== CURRENT_SERIE_A_TEAMS.length) {
    const found = new Set(teams.map((entry) => CURRENT_SERIE_A_TEAMS.find((name) => matchesOfficialTeam(entry.team.name, name))));
    const missing = CURRENT_SERIE_A_TEAMS.filter((name) => !found.has(name));
    throw new Error(`Squadre Serie A non risolte: ${missing.join(", ")}`);
  }
  return { teams, calls, discoverySeason };
}

function keepExisting(base: SerieAPlayerRecord, existing?: SerieAPlayerRecord): SerieAPlayerRecord {
  if (!existing) return base;
  return {
    ...existing,
    ...base,
    stats_season: existing.stats_season ?? null,
    appearances: existing.appearances ?? null,
    starts: existing.starts ?? null,
    minutes: existing.minutes ?? null,
    rating: existing.rating ?? null,
    goals: existing.goals ?? null,
    assists: existing.assists ?? null,
    shots_total: existing.shots_total ?? null,
    shots_on: existing.shots_on ?? null,
    passes_total: existing.passes_total ?? null,
    key_passes: existing.key_passes ?? null,
    pass_accuracy: existing.pass_accuracy ?? null,
    dribbles_attempts: existing.dribbles_attempts ?? null,
    dribbles_success: existing.dribbles_success ?? null,
    tackles: existing.tackles ?? null,
    official_quote: existing.official_quote ?? null,
    official_fvm: existing.official_fvm ?? null,
    official_role: existing.official_role ?? null,
  };
}

function performanceRecord(base: SerieAPlayerRecord, item: ApiPlayerStats, stats: ApiStatistic, statsSeason: number, origin: "serie-a" | "incoming-transfer", extraRaw?: Record<string, unknown>) {
  const rating = Number.parseFloat(stats.games?.rating ?? "");
  const updated: SerieAPlayerRecord = {
    ...base,
    firstname: item.player.firstname ?? base.firstname ?? null,
    lastname: item.player.lastname ?? base.lastname ?? null,
    age: item.player.age ?? base.age ?? null,
    birth_date: item.player.birth?.date ?? base.birth_date ?? null,
    nationality: item.player.nationality ?? base.nationality ?? null,
    height: item.player.height ?? base.height ?? null,
    weight: item.player.weight ?? base.weight ?? null,
    photo_url: item.player.photo ?? base.photo_url ?? null,
    stats_season: statsSeason,
    appearances: stats.games?.appearences ?? 0,
    starts: stats.games?.lineups ?? 0,
    minutes: stats.games?.minutes ?? 0,
    rating: Number.isFinite(rating) ? rating : null,
    goals: stats.goals?.total ?? 0,
    assists: stats.goals?.assists ?? 0,
    shots_total: stats.shots?.total ?? 0,
    shots_on: stats.shots?.on ?? 0,
    passes_total: stats.passes?.total ?? 0,
    key_passes: stats.passes?.key ?? 0,
    pass_accuracy: stats.passes?.accuracy ?? 0,
    dribbles_attempts: stats.dribbles?.attempts ?? 0,
    dribbles_success: stats.dribbles?.success ?? 0,
    tackles: stats.tackles?.total ?? 0,
    current_injured: item.player.injured ?? base.current_injured ?? false,
    raw: {
      provider: item,
      ...extraRaw,
      performanceContext: {
        team: stats.team?.name ?? null,
        league: stats.league?.name ?? (stats.league?.id === SERIE_A_LEAGUE_ID ? "Serie A" : null),
        country: stats.league?.country ?? null,
        origin,
      },
    },
  };
  const scores = calculatePlayerScores(updated);
  return { ...updated, quote_estimate: scores.quoteEstimate, ds_score: scores.dsScore, potential_score: scores.potential };
}

function bestStatistic(statistics: ApiStatistic[], preferredTeamId?: number) {
  const preferred = preferredTeamId ? statistics.filter((entry) => entry.team?.id === preferredTeamId) : [];
  const pool = preferred.length ? preferred : statistics;
  return [...pool].sort((a, b) => (b.games?.minutes ?? 0) - (a.games?.minutes ?? 0) || (b.games?.appearences ?? 0) - (a.games?.appearences ?? 0))[0];
}

export async function syncSerieASquads() {
  const existingRows = await getSerieAPlayers();
  const existing = new Map(existingRows.map((player) => [player.provider_id, player]));
  const resolved = await resolveCurrentSerieATeams();
  const teams = resolved.teams;

  const players = new Map<number, SerieAPlayerRecord>();
  let calls = resolved.calls;
  for (const entry of teams) {
    const squadResult = await request<ApiSquad[]>(`/players/squads?team=${entry.team.id}`, true);
    calls += 1;
    const squad = squadResult.response[0];
    if (!squad) continue;
    for (const player of squad.players ?? []) {
      const role = roleFromPosition(player.position);
      const base: SerieAPlayerRecord = {
        provider_id: player.id,
        name: player.name,
        age: player.age ?? null,
        photo_url: player.photo ?? null,
        role,
        position: player.position ?? null,
        shirt_number: player.number ?? null,
        team_id: entry.team.id,
        team_name: entry.team.name,
        team_code: entry.team.code ?? null,
        team_logo: entry.team.logo ?? squad.team.logo ?? null,
        quote_estimate: 1,
        ds_score: 45,
        potential_score: player.age && player.age <= 23 ? 66 : 48,
        raw: player,
      };
      const merged = keepExisting(base, existing.get(player.id));
      const scores = calculatePlayerScores(merged);
      players.set(player.id, { ...merged, quote_estimate: scores.quoteEstimate, ds_score: scores.dsScore, potential_score: scores.potential });
    }
  }
  await upsertSerieAPlayers([...players.values()]);
  return { teams: teams.length, players: players.size, calls, season: season(), discoverySeason: resolved.discoverySeason };
}

export async function syncPreviousSeasonStats() {
  const currentRows = await getSerieAPlayers();
  if (!currentRows.length) throw new Error("Rosa Serie A non ancora sincronizzata");
  const current = new Map(currentRows.map((player) => [player.provider_id, player]));
  let statsSeason = previousSeason();
  let first: ApiResponse<ApiPlayerStats[]>;
  let calls = 1;
  try {
    first = await request<ApiPlayerStats[]>(`/players?league=${SERIE_A_LEAGUE_ID}&season=${statsSeason}&page=1`);
  } catch {
    statsSeason = Number(process.env.API_FOOTBALL_STATS_SEASON) || 2024;
    first = await request<ApiPlayerStats[]>(`/players?league=${SERIE_A_LEAGUE_ID}&season=${statsSeason}&page=1`, true);
    calls += 1;
  }
  const pages = Math.min(first.paging?.total ?? 1, 42);
  const responses = [...first.response];
  let stoppedReason: string | null = null;
  for (let page = 2; page <= pages; page += 1) {
    try {
      const result = await request<ApiPlayerStats[]>(`/players?league=${SERIE_A_LEAGUE_ID}&season=${statsSeason}&page=${page}`, true);
      calls += 1;
      responses.push(...result.response);
    } catch (error) {
      stoppedReason = error instanceof Error ? error.message : "Limite del provider raggiunto";
      break;
    }
  }

  const injuryMap = new Map<number, { count: number; note: string | null }>();
  try {
    const injuriesResult = await request<ApiInjury[]>(`/injuries?league=${SERIE_A_LEAGUE_ID}&season=${season()}`, true);
    calls += 1;
    for (const injury of injuriesResult.response) {
      const id = injury.player?.id;
      if (!id) continue;
      const previous = injuryMap.get(id) ?? { count: 0, note: null };
      injuryMap.set(id, { count: previous.count + 1, note: injury.reason ?? injury.type ?? previous.note });
    }
  } catch {
    // Alcuni piani gratuiti non includono gli infortuni della stagione corrente.
    // Le statistiche sportive restano comunque utilizzabili.
  }

  let enriched = 0;
  for (const item of responses) {
    const base = current.get(item.player.id);
    if (!base) continue;
    const stats = item.statistics.find((entry) => entry.league?.id === SERIE_A_LEAGUE_ID) ?? item.statistics[0];
    if (!stats) continue;
    const injury = injuryMap.get(item.player.id);
    const updated = performanceRecord({
      ...base,
      current_injured: item.player.injured ?? Boolean(injury),
      injuries_count: injury?.count ?? 0,
      injury_note: injury?.note ?? null,
    }, item, stats, statsSeason, "serie-a");
    current.set(item.player.id, updated);
    enriched += 1;
  }
  await upsertSerieAPlayers([...current.values()]);
  return { players: current.size, enriched, pages, calls, statsSeason, partial: Boolean(stoppedReason), stoppedReason };
}

function mostCommonStatsSeason(players: SerieAPlayerRecord[]) {
  const counts = new Map<number, number>();
  for (const player of players) {
    if (player.stats_season) counts.set(player.stats_season, (counts.get(player.stats_season) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? previousSeason();
}

function hasStoredPerformance(player: SerieAPlayerRecord) {
  return player.stats_season !== null && player.stats_season !== undefined
    && ((player.appearances ?? 0) > 0 || (player.minutes ?? 0) > 0);
}

export async function syncPlayerPreviousSeason(playerId: number) {
  const currentRows = await getSerieAPlayers();
  const base = currentRows.find((player) => player.provider_id === playerId);
  if (!base) throw new Error("Giocatore non trovato nella rosa Serie A");

  const statsSeason = Number(process.env.API_FOOTBALL_STATS_SEASON) || previousSeason();

  if (hasStoredPerformance(base) && base.stats_season === statsSeason) {
    return { player: base, fetched: false, statsSeason: base.stats_season };
  }

  // Se Vercel richiede una stagione più recente di quella già salvata, il
  // profilo viene aggiornato invece di restare bloccato sulla vecchia cache.
  const result = await request<ApiPlayerStats[]>(`/players?id=${playerId}&season=${statsSeason}`);
  const item = result.response[0];
  if (!item) throw new Error(`Nessuna statistica disponibile per la stagione ${statsSeason}/${String(statsSeason + 1).slice(-2)}`);

  const stats = bestStatistic(item.statistics, base.team_id);
  if (!stats || (stats.games?.appearences ?? 0) < 1) {
    throw new Error(`Il giocatore non ha presenze registrate nella stagione ${statsSeason}/${String(statsSeason + 1).slice(-2)}`);
  }

  const origin = stats.league?.id === SERIE_A_LEAGUE_ID ? "serie-a" : "incoming-transfer";
  const updated = performanceRecord(base, item, stats, statsSeason, origin);
  await upsertSerieAPlayers([updated]);
  return { player: updated, fetched: true, statsSeason };
}

function alreadyHasIncomingContext(player: SerieAPlayerRecord, statsSeason: number) {
  if (player.stats_season !== statsSeason || !player.raw || typeof player.raw !== "object") return false;
  const context = (player.raw as { performanceContext?: { origin?: string } }).performanceContext;
  return context?.origin === "incoming-transfer";
}

export async function syncIncomingTransferStats() {
  const currentRows = await getSerieAPlayers();
  if (!currentRows.length) throw new Error("Rosa Serie A non ancora sincronizzata");
  const current = new Map(currentRows.map((player) => [player.provider_id, player]));
  const resolved = await resolveCurrentSerieATeams();
  const currentTeamIds = new Set(resolved.teams.map((entry) => entry.team.id));
  const currentPlayerIds = new Set(currentRows.map((player) => player.provider_id));
  const seasonStart = `${season()}-01-01`;
  const incoming = new Map<number, { playerId: number; playerName: string; date: string; type: string; fromTeamId?: number; fromTeam: string; toTeam: string }>();
  let calls = resolved.calls;
  let stoppedReason: string | null = null;

  for (const entry of resolved.teams) {
    try {
      const result = await request<ApiTransfer[]>(`/transfers?team=${entry.team.id}`, true);
      calls += 1;
      for (const item of result.response) {
        const playerId = item.player?.id;
        if (!playerId || !currentPlayerIds.has(playerId)) continue;
        for (const transfer of item.transfers ?? []) {
          const destinationId = transfer.teams?.in?.id;
          const originId = transfer.teams?.out?.id;
          const date = transfer.date ?? "";
          if (destinationId !== entry.team.id || !date || date < seasonStart || !originId || currentTeamIds.has(originId)) continue;
          const candidate = {
            playerId,
            playerName: item.player?.name ?? current.get(playerId)?.name ?? "Giocatore",
            date,
            type: transfer.type ?? "Trasferimento",
            fromTeamId: originId,
            fromTeam: transfer.teams?.out?.name ?? "Club precedente",
            toTeam: transfer.teams?.in?.name ?? entry.team.name,
          };
          const previous = incoming.get(playerId);
          if (!previous || candidate.date > previous.date) incoming.set(playerId, candidate);
        }
      }
    } catch (error) {
      stoppedReason = error instanceof Error ? error.message : "Limite trasferimenti raggiunto";
      break;
    }
  }

  const statsSeason = Number(process.env.API_FOOTBALL_STATS_SEASON) || mostCommonStatsSeason(currentRows);
  const limit = Math.max(1, Math.min(10, Number(process.env.API_FOOTBALL_IMPORTS_PER_RUN) || 6));
  const candidates = [...incoming.values()]
    .filter((transfer) => {
      const player = current.get(transfer.playerId);
      return player && !alreadyHasIncomingContext(player, statsSeason);
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
  const updates: SerieAPlayerRecord[] = [];

  for (const transfer of candidates) {
    const base = current.get(transfer.playerId);
    if (!base) continue;
    try {
      const result = await request<ApiPlayerStats[]>(`/players?id=${transfer.playerId}&season=${statsSeason}`, true);
      calls += 1;
      const item = result.response[0];
      if (!item) continue;
      const stats = bestStatistic(item.statistics, transfer.fromTeamId);
      if (!stats || (stats.games?.appearences ?? 0) < 1) continue;
      const updated = performanceRecord(base, item, stats, statsSeason, "incoming-transfer", { transfer });
      current.set(transfer.playerId, updated);
      updates.push(updated);
    } catch (error) {
      stoppedReason = error instanceof Error ? error.message : "Limite statistiche raggiunto";
      break;
    }
  }

  if (updates.length) await upsertSerieAPlayers(updates);
  return {
    detected: incoming.size,
    candidates: candidates.length,
    enriched: updates.length,
    pending: Math.max(0, incoming.size - currentRows.filter((player) => alreadyHasIncomingContext(player, statsSeason)).length - updates.length),
    calls,
    statsSeason,
    partial: Boolean(stoppedReason),
    stoppedReason,
  };
}
