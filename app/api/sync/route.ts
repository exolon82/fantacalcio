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

  const [sportsDb, apiFootball, footballData, gnews] = await Promise.all([
    check("https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=Inter"),
    apiFootballKey ? check("https://v3.football.api-sports.io/status", { headers: { "x-apisports-key": apiFootballKey } }) : false,
    footballDataKey ? check("https://api.football-data.org/v4/competitions/SA", { headers: { "X-Auth-Token": footballDataKey } }) : false,
    gnewsKey ? check(`https://gnews.io/api/v4/search?q=serie%20a%20calciomercato&lang=it&max=1&apikey=${encodeURIComponent(gnewsKey)}`) : false,
  ]);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    providers: [
      { id: "thesportsdb", live: sportsDb, configured: true },
      { id: "api-football", live: apiFootball, configured: Boolean(apiFootballKey) },
      { id: "football-data", live: footballData, configured: Boolean(footballDataKey) },
      { id: "gnews", live: gnews, configured: Boolean(gnewsKey) },
    ],
  });
}
