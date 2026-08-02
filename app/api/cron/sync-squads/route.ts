import { NextResponse } from "next/server";
import { syncSerieASquads } from "@/lib/api-football";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  try {
    const result = await syncSerieASquads();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Sincronizzazione rosa non riuscita" }, { status: 500 });
  }
}

