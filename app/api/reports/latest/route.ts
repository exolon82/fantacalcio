import { NextResponse } from "next/server";
import { fallbackDailyReport } from "@/lib/reports";
import { getLatestReport, isDatabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stored = await getLatestReport();
    if (stored) return NextResponse.json({ report: stored.payload, sources: stored.sources, stored: true, databaseConfigured: true });
    return NextResponse.json({ report: fallbackDailyReport(), sources: [], stored: false, databaseConfigured: isDatabaseConfigured() });
  } catch (error) {
    return NextResponse.json({ report: fallbackDailyReport(), sources: [], stored: false, databaseConfigured: true, warning: error instanceof Error ? error.message : "Database non raggiungibile" });
  }
}

