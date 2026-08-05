import { NextResponse } from "next/server";
import { syncOfficialQuotes } from "@/lib/fantacalcio-list";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST() {
  try {
    const result = await syncOfficialQuotes();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[quotes-sync]", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Aggiornamento quotazioni non riuscito" }, { status: 500 });
  }
}
