import type { SerieAPlayerRecord } from "./serie-a";

export type StoredDailyReport = {
  report_date: string;
  payload: unknown;
  sources: unknown[];
  created_at?: string;
  updated_at?: string;
};

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

function headers(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export function isDatabaseConfigured() {
  return Boolean(config());
}

export async function getLatestReport(): Promise<StoredDailyReport | null> {
  const settings = config();
  if (!settings) return null;
  const response = await fetch(`${settings.url}/rest/v1/daily_reports?select=report_date,payload,sources,created_at,updated_at&order=report_date.desc&limit=1`, {
    headers: headers(settings.key),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase read ${response.status}`);
  const rows = (await response.json()) as StoredDailyReport[];
  return rows[0] ?? null;
}

export async function saveDailyReport(report: StoredDailyReport) {
  const settings = config();
  if (!settings) return false;
  const response = await fetch(`${settings.url}/rest/v1/daily_reports?on_conflict=report_date`, {
    method: "POST",
    headers: {
      ...headers(settings.key),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(report),
  });
  if (!response.ok) throw new Error(`Supabase write ${response.status}: ${(await response.text()).slice(0, 180)}`);
  return true;
}

export async function getSerieAPlayers(): Promise<SerieAPlayerRecord[]> {
  const settings = config();
  if (!settings) return [];
  const response = await fetch(`${settings.url}/rest/v1/serie_a_players?select=*&order=ds_score.desc&limit=700`, {
    headers: headers(settings.key),
    cache: "no-store",
  });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Supabase players read ${response.status}: ${(await response.text()).slice(0, 160)}`);
  return (await response.json()) as SerieAPlayerRecord[];
}

export async function upsertSerieAPlayers(players: SerieAPlayerRecord[]) {
  const settings = config();
  if (!settings) throw new Error("Supabase non configurato");
  for (let index = 0; index < players.length; index += 100) {
    const batch = players.slice(index, index + 100).map((player) => ({ ...player, updated_at: new Date().toISOString() }));
    const response = await fetch(`${settings.url}/rest/v1/serie_a_players?on_conflict=provider_id`, {
      method: "POST",
      headers: { ...headers(settings.key), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(batch),
    });
    if (!response.ok) throw new Error(`Supabase players write ${response.status}: ${(await response.text()).slice(0, 220)}`);
  }
}

export async function deleteSerieAPlayers(providerIds: number[]) {
  const settings = config();
  if (!settings || !providerIds.length) return;
  const response = await fetch(`${settings.url}/rest/v1/serie_a_players?provider_id=in.(${providerIds.join(",")})`, {
    method: "DELETE",
    headers: headers(settings.key),
  });
  if (!response.ok) throw new Error(`Supabase players delete ${response.status}: ${(await response.text()).slice(0, 180)}`);
}
