import { NextResponse } from "next/server";
import { syncOfficialQuotes } from "@/lib/fantacalcio-list";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  try {
    const result = await syncOfficialQuotes();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[sync-quotes]", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Sincronizzazione Listone non riuscita" }, { status: 500 });
  }
}
