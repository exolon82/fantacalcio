import { askScoutAI } from "./ai";
import { scoutPlayers } from "./scouting-data";
import { getSerieAPlayers } from "./supabase";

export type NewsSource = { title: string; url: string; publishedAt: string; description: string };
export type DailyReport = {
  date: string;
  headline: string;
  summary: string;
  prospects: Array<{ player: string; age: number; club: string; signal: "SALE" | "STABILE" | "RISCHIO"; reason: string }>;
  lowCostWatch: Array<{ player: string; role: string; reason: string }>;
  alerts: string[];
  marketPulse: string;
};

const reportSchema = {
  type: "object",
  additionalProperties: false,
  required: ["date", "headline", "summary", "prospects", "lowCostWatch", "alerts", "marketPulse"],
  properties: {
    date: { type: "string" },
    headline: { type: "string" },
    summary: { type: "string" },
    prospects: {
      type: "array", minItems: 1, maxItems: 5,
      items: { type: "object", additionalProperties: false, required: ["player", "age", "club", "signal", "reason"], properties: {
        player: { type: "string" }, age: { type: "integer" }, club: { type: "string" }, signal: { type: "string", enum: ["SALE", "STABILE", "RISCHIO"] }, reason: { type: "string" },
      } },
    },
    lowCostWatch: {
      type: "array", minItems: 2, maxItems: 5,
      items: { type: "object", additionalProperties: false, required: ["player", "role", "reason"], properties: {
        player: { type: "string" }, role: { type: "string" }, reason: { type: "string" },
      } },
    },
    alerts: { type: "array", minItems: 1, maxItems: 4, items: { type: "string" } },
    marketPulse: { type: "string" },
  },
};

export async function fetchYoungSerieANews(): Promise<NewsSource[]> {
  const key = process.env.GNEWS_API_KEY;
  if (!key) return [];
  const query = encodeURIComponent('Serie A (giovane OR talento OR Under 23 OR calciomercato)');
  const response = await fetch(`https://gnews.io/api/v4/search?q=${query}&lang=it&country=it&max=10&sortby=publishedAt&apikey=${encodeURIComponent(key)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`GNews ${response.status}`);
  const data = (await response.json()) as { articles?: Array<{ title?: string; url?: string; publishedAt?: string; description?: string }> };
  return (data.articles ?? []).flatMap((article) => article.title && article.url ? [{
    title: article.title,
    url: article.url,
    publishedAt: article.publishedAt ?? "",
    description: article.description ?? "",
  }] : []);
}

export function fallbackDailyReport(date = new Date().toISOString().slice(0, 10)): DailyReport {
  return {
    date,
    headline: "Giovani sotto lente, prezzo prima dell’hype",
    summary: "Anteprima dimostrativa: il report live verrà generato ogni mattina quando OpenAI, GNews e Supabase saranno collegati.",
    prospects: [
      { player: "Ange-Yoan Bonny", age: 22, club: "Inter", signal: "STABILE", reason: "Upside interessante, ma va acquistato soltanto a prezzo da scommessa finché la titolarità non cresce." },
    ],
    lowCostWatch: [
      { player: "Mile Svilar", role: "P", reason: "Continuità e titolarità senza usare uno dei due slot stella." },
      { player: "Alessandro Bastoni", role: "D", reason: "Affidabilità e costruzione a quota inferiore ai premium di reparto." },
      { player: "Riccardo Orsolini", role: "C", reason: "Bonus potenziali con un prezzo più razionale dei top." },
    ],
    alerts: ["Confermare i due leader di ogni reparto senza superare i tetti.", "Aggiornare titolarità, coppie portieri e infortuni prima dell’asta."],
    marketPulse: "Modalità anteprima: fonti live non ancora collegate.",
  };
}

export async function generateDailyReport(date = new Date().toISOString().slice(0, 10)) {
  let sources: NewsSource[] = [];
  try { sources = await fetchYoungSerieANews(); } catch { sources = []; }
  let youngPlayerSignals: unknown[] = scoutPlayers.filter((player) => player.age <= 25);
  try {
    const livePlayers = await getSerieAPlayers();
    if (livePlayers.length) youngPlayerSignals = livePlayers
      .filter((player) => (player.age ?? 99) <= 25)
      .sort((a, b) => b.potential_score - a.potential_score)
      .slice(0, 35)
      .map((player) => ({ name: player.name, age: player.age, club: player.team_name, role: player.role, potential: player.potential_score, score: player.ds_score, quote: player.official_quote ?? player.quote_estimate, quoteType: player.official_quote ? "ufficiale" : "stima UNDICI", appearances: player.appearances, minutes: player.minutes, goals: player.goals, assists: player.assists, injured: player.current_injured }));
  } catch { /* Il report conserva i segnali dimostrativi se il database non è pronto. */ }

  const configuredModel = process.env.OPENAI_REPORT_MODEL?.trim();
  const reportModel = configuredModel?.startsWith("gpt-") ? configuredModel : "gpt-5.6-luna";
  const generated = await askScoutAI<DailyReport>({
    model: reportModel,
    reasoningEffort: "low",
    timeoutMs: 80000,
    schema: reportSchema,
    schemaName: "daily_serie_a_report",
    instructions: "Sei il Direttore Sportivo AI di un'app di fantacalcio. Produci in italiano un report prudente e operativo sui giovani della Serie A. Separa fatti, segnali e inferenze; non inventare trasferimenti, convocazioni giovanili, infortuni o titolarità. Dai priorità a possibili stelle Under 24 e opportunità low-cost entro 10 crediti, specialmente quando esiste un segnale verificato Under 18/19. La strategia d'asta usa due leader in difesa, due a centrocampo e due in attacco, poi completa con valore e prospettiva. Usa esclusivamente i dati forniti.",
    input: { date, news: sources, youngPlayerSignals },
  });

  return { report: generated ? { ...generated, date } : fallbackDailyReport(date), sources, aiConfigured: Boolean(process.env.OPENAI_API_KEY) };
}
