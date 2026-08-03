import { NextResponse } from "next/server";
import { generateDailyReport } from "@/lib/reports";
import { getLatestReport, saveDailyReport } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST() {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const existing = await getLatestReport();
    if (existing?.report_date === date) {
      return NextResponse.json({ report: existing.payload, sources: existing.sources, stored: true, reused: true });
    }

    const { report, sources, aiConfigured } = await generateDailyReport(date);
    if (!aiConfigured) return NextResponse.json({ error: "OPENAI_API_KEY non configurata" }, { status: 503 });
    const stored = await saveDailyReport({ report_date: date, payload: report, sources, updated_at: new Date().toISOString() });
    return NextResponse.json({ report, sources, stored, reused: false });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Generazione report non riuscita" }, { status: 500 });
  }
}
