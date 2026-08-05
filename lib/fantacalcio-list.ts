import { deleteSerieAPlayers, getSerieAPlayers, upsertSerieAPlayers } from "./supabase";
import type { SerieAPlayerRecord, SerieARole } from "./serie-a";

export const OFFICIAL_LIST_URL = "https://www.fantacalcio.it/quotazioni-fantacalcio";

type OfficialListPlayer = {
  sourceId: number;
  name: string;
  teamCode: string;
  team: string;
  role: SerieARole;
  quote: number;
  fvm: number;
};

const TEAM_NAMES: Record<string, string> = {
  ATA: "Atalanta", BOL: "Bologna", CAG: "Cagliari", COM: "Como", FIO: "Fiorentina",
  FRO: "Frosinone", GEN: "Genoa", INT: "Inter", JUV: "Juventus", LAZ: "Lazio",
  LEC: "Lecce", MIL: "Milan", MON: "Monza", NAP: "Napoli", PAR: "Parma",
  ROM: "Roma", SAS: "Sassuolo", TOR: "Torino", UDI: "Udinese", VEN: "Venezia",
};

const TEAM_ALIASES: Record<string, string[]> = {
  INT: ["inter", "inter milan", "internazionale"],
  MIL: ["milan", "ac milan"],
  MON: ["monza", "ac monza"],
  ROM: ["roma", "as roma"],
  LAZ: ["lazio", "ss lazio"],
  LEC: ["lecce", "us lecce"],
  FIO: ["fiorentina", "acf fiorentina"],
};

function decodeHtml(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .trim();
}

function field(row: string, pattern: RegExp) {
  return decodeHtml(row.match(pattern)?.[1] ?? "").trim();
}

export function parseOfficialList(html: string): OfficialListPlayer[] {
  const rows = html.match(/<tr class="player-row"[\s\S]*?<\/tr>/gi) ?? [];
  return rows.flatMap((row) => {
    const hrefMatch = row.match(/href="[^"]*\/serie-a\/squadre\/([^/]+)\/[^/]+\/(\d+)[^"?]*"/i);
    const name = field(row, /data-filter-keywords="([^"]+)"/i);
    const teamCode = field(row, /class="player-team"[^>]*>[\s\S]*?([A-Z]{3})[\s\S]*?<\/td>/i).toUpperCase();
    const role = field(row, /data-filter-role-classic="([pdca])"/i).toUpperCase() as SerieARole;
    const quote = Number(field(row, /class="player-classic-current-price"[^>]*>[\s\S]*?([\d.]+)[\s\S]*?<\/td>/i));
    const fvm = Number(field(row, /class="player-classic-fvm"[^>]*>[\s\S]*?([\d.]+)[\s\S]*?<\/td>/i));
    const id = Number(hrefMatch?.[2]);
    if (!id || !name || !TEAM_NAMES[teamCode] || !["P", "D", "C", "A"].includes(role) || !Number.isFinite(quote) || quote < 1) return [];
    return [{ sourceId: id, name, teamCode, team: TEAM_NAMES[teamCode], role, quote, fvm: Number.isFinite(fvm) ? fvm : 0 }];
  });
}

function normalise(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/ø/g, "o")
    .replace(/đ/g, "d")
    .toLocaleLowerCase("it")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value?: string | null) {
  return normalise(value).split(" ").filter(Boolean);
}

function playerTeamCode(player: SerieAPlayerRecord) {
  const team = normalise(player.team_name);
  const byName = Object.entries(TEAM_NAMES).find(([code, name]) => (TEAM_ALIASES[code] ?? [normalise(name)]).includes(team))?.[0];
  if (byName) return byName;
  const explicit = player.team_code?.toUpperCase();
  if (explicit && TEAM_NAMES[explicit]) return explicit;
  return "";
}

function nameScore(official: OfficialListPlayer, player: SerieAPlayerRecord) {
  const officialTokens = tokens(official.name);
  const significant = officialTokens.filter((token) => token.length > 1);
  const initials = officialTokens.filter((token) => token.length === 1);
  const playerTokens = new Set([
    ...tokens(player.name),
    ...tokens(player.firstname),
    ...tokens(player.lastname),
  ]);
  const variants = [player.name, `${player.firstname ?? ""} ${player.lastname ?? ""}`, player.lastname].map(normalise).filter(Boolean);
  const officialNormalised = normalise(official.name);
  const lastname = normalise(player.lastname);
  let score = 0;

  if (variants.includes(officialNormalised)) score = 125;
  if (lastname && (lastname === officialNormalised || normalise(significant.join(" ")) === lastname)) score = Math.max(score, 118);
  if (significant.length && significant.every((token) => playerTokens.has(token))) score = Math.max(score, 92 + significant.length * 3);
  if (!score && significant.some((token) => token.length >= 4 && playerTokens.has(token))) score = 68;

  if (initials.length) {
    const givenName = normalise(player.firstname) || tokens(player.name)[0] || "";
    const playerInitials = tokens(player.firstname).map((token) => token[0]);
    const initialMatch = initials.every((initial, index) => playerInitials[index] === initial)
      || initials[0] === givenName[0];
    score += initialMatch ? 18 : -24;
  }
  if (playerTeamCode(player) === official.teamCode) score += 28;
  if (player.provider_id > 0) score += 40;
  return score;
}

function matchPlayers(list: OfficialListPlayer[], players: SerieAPlayerRecord[]) {
  const used = new Set<number>();
  const matches: Array<{ official: OfficialListPlayer; player: SerieAPlayerRecord; score: number }> = [];
  const unmatched: OfficialListPlayer[] = [];

  for (const official of list) {
    const ranked = players
      .filter((player) => !used.has(player.provider_id))
      .map((player) => ({ player, score: nameScore(official, player) }))
      .filter((candidate) => candidate.score >= 86)
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    const second = ranked[1];
    if (!best || (second && best.score - second.score < 8)) {
      unmatched.push(official);
      continue;
    }
    used.add(best.player.provider_id);
    matches.push({ official, player: best.player, score: best.score });
  }
  return { matches, unmatched };
}

export async function fetchOfficialList() {
  const response = await fetch(OFFICIAL_LIST_URL, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "UNDICI-Scouting-Room/1.0 (+official-quotation-sync)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error(`Listone Fantacalcio non raggiungibile (${response.status})`);
  const players = parseOfficialList(await response.text());
  if (players.length < 400) throw new Error(`Listone incompleto: trovati soltanto ${players.length} calciatori`);
  return players;
}

export async function syncOfficialQuotes() {
  const [officialPlayers, storedPlayers] = await Promise.all([fetchOfficialList(), getSerieAPlayers()]);
  if (!storedPlayers.length) throw new Error("Rosa Serie A non ancora presente nel database");
  const { matches, unmatched } = matchPlayers(officialPlayers, storedPlayers);
  if (matches.length < 350) throw new Error(`Abbinamento interrotto per sicurezza: soltanto ${matches.length} corrispondenze certe`);

  const teamMetadata = new Map(storedPlayers.map((player) => [playerTeamCode(player), {
    team_id: player.team_id,
    team_logo: player.team_logo ?? null,
  }]));
  const syncedAt = new Date().toISOString();
  const updates = matches.map(({ official, player, score }) => {
    const targetTeam = teamMetadata.get(official.teamCode);
    const raw = player.raw && typeof player.raw === "object" && !Array.isArray(player.raw) ? player.raw as Record<string, unknown> : {};
    return {
      ...player,
      team_id: targetTeam?.team_id ?? player.team_id,
      team_name: official.team,
      team_code: official.teamCode,
      team_logo: targetTeam?.team_logo ?? player.team_logo ?? null,
      official_quote: official.quote,
      official_fvm: official.fvm,
      official_role: official.role,
      raw: {
        ...raw,
        officialList: {
          source: OFFICIAL_LIST_URL,
          sourceId: official.sourceId,
          displayName: official.name,
          teamCode: official.teamCode,
          role: official.role,
          quote: official.quote,
          fvm: official.fvm,
          matchScore: score,
          syncedAt,
        },
      },
    } satisfies SerieAPlayerRecord;
  });
  const additions = unmatched.map((official) => {
    const targetTeam = teamMetadata.get(official.teamCode);
    const score = Math.min(95, Math.round(35 + official.quote * 1.5));
    return {
      provider_id: -official.sourceId,
      name: official.name,
      firstname: null,
      lastname: null,
      age: null,
      birth_date: null,
      nationality: null,
      height: null,
      weight: null,
      photo_url: null,
      role: official.role,
      position: "Listone Fantacalcio",
      shirt_number: null,
      team_id: targetTeam?.team_id ?? -official.sourceId,
      team_name: official.team,
      team_code: official.teamCode,
      team_logo: targetTeam?.team_logo ?? null,
      stats_season: null,
      appearances: null,
      starts: null,
      minutes: null,
      rating: null,
      goals: null,
      assists: null,
      shots_total: null,
      shots_on: null,
      passes_total: null,
      key_passes: null,
      pass_accuracy: null,
      dribbles_attempts: null,
      dribbles_success: null,
      tackles: null,
      current_injured: false,
      injuries_count: 0,
      injury_note: null,
      quote_estimate: official.quote,
      official_quote: official.quote,
      official_fvm: official.fvm,
      official_role: official.role,
      ds_score: score,
      potential_score: score,
      raw: {
        officialList: {
          source: OFFICIAL_LIST_URL,
          sourceId: official.sourceId,
          displayName: official.name,
          teamCode: official.teamCode,
          role: official.role,
          quote: official.quote,
          fvm: official.fvm,
          officialOnly: true,
          syncedAt,
        },
      },
    } satisfies SerieAPlayerRecord;
  });
  await upsertSerieAPlayers([...updates, ...additions]);
  const staleOfficialOnlyIds = matches
    .filter(({ player }) => player.provider_id > 0)
    .map(({ official }) => -official.sourceId)
    .filter((id) => storedPlayers.some((player) => player.provider_id === id));
  await deleteSerieAPlayers(staleOfficialOnlyIds);
  const transferred = updates.filter((player, index) => player.team_name !== matches[index].player.team_name).length;
  return {
    source: OFFICIAL_LIST_URL,
    season: "2026/27",
    listed: officialPlayers.length,
    updated: updates.length + additions.length,
    matched: updates.length,
    added: additions.length,
    transferred,
    unmatched: unmatched.length,
    unmatchedPreview: unmatched.slice(0, 20).map((player) => `${player.name} (${player.teamCode})`),
    syncedAt,
  };
}
