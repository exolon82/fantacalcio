import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function check(url: string, init?: RequestInit) {
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(6000) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  const apiFootballKey = process.env.API_FOOTBALL_KEY;
  const footballDataKey = process.env.FOOTBALL_DATA_KEY;
  const gnewsKey = process.env.GNEWS_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;
  const configuredModel = process.env.OPENAI_REPORT_MODEL;
  const openAIModel = configuredModel?.startsWith("gpt-") ? configuredModel : "gpt-5.6-luna";
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  const [sportsDb, apiFootball, footballData, gnews, openAI, supabase] = await Promise.all([
    check("https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=Inter"),
    apiFootballKey ? check("https://v3.football.api-sports.io/status", { headers: { "x-apisports-key": apiFootballKey } }) : false,
    footballDataKey ? check("https://api.football-data.org/v4/competitions/SA", { headers: { "X-Auth-Token": footballDataKey } }) : false,
    gnewsKey ? check(`https://gnews.io/api/v4/search?q=serie%20a%20calciomercato&lang=it&max=1&apikey=${encodeURIComponent(gnewsKey)}`) : false,
    openAIKey ? check(`https://api.openai.com/v1/models/${encodeURIComponent(openAIModel)}`, { headers: { Authorization: `Bearer ${openAIKey}` } }) : false,
    supabaseUrl && supabaseKey ? check(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/daily_reports?select=report_date&limit=1`, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }) : false,
  ]);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    providers: [
      { id: "football-data", label: "football-data.org", live: footballData, configured: Boolean(footballDataKey) },
      { id: "api-football", label: "API-Football", live: apiFootball, configured: Boolean(apiFootballKey) },
      { id: "gnews", label: "GNews", live: gnews, configured: Boolean(gnewsKey) },
      { id: "thesportsdb", label: "TheSportsDB", live: sportsDb, configured: true },
      { id: "openai", label: "OpenAI", live: openAI, configured: Boolean(openAIKey) },
      { id: "supabase", label: "Supabase", live: supabase, configured: Boolean(supabaseUrl && supabaseKey) },
    ],
  });
}
