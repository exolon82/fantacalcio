import { NextResponse } from "next/server";
import { generateDailyReport } from "@/lib/reports";
import { saveDailyReport } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const date = new Date().toISOString().slice(0, 10);
    const { report, sources, aiConfigured } = await generateDailyReport(date);
    const stored = await saveDailyReport({ report_date: date, payload: report, sources, updated_at: new Date().toISOString() });
    return NextResponse.json({ ok: true, date, stored, aiConfigured, articles: sources.length });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Generazione report non riuscita" }, { status: 500 });
  }
}
