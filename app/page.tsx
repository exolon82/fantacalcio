"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "P" | "D" | "C" | "A";
type Tab = "radar" | "rosa" | "mercato" | "confronta" | "ai" | "fonti";

type AiPick = { player: string; club: string; role: Role; tier: "Leader" | "Low-cost" | "Portiere"; maxBid: number; reason: string; risk: string };
type AiPlan = { title: string; formation: string; budget: number; estimatedSpend: number; leadersUsed: number; goalkeepers: AiPick[]; leaders: AiPick[]; lowCost: AiPick[]; tacticalNote: string; budgetRule: string };
type DailyReport = {
  date: string;
  headline: string;
  summary: string;
  prospects: Array<{ player: string; age: number; club: string; signal: "SALE" | "STABILE" | "RISCHIO"; reason: string }>;
  lowCostWatch: Array<{ player: string; role: string; reason: string }>;
  alerts: string[];
  marketPulse: string;
};
type MarketNewsItem = { title: string; url: string; publishedAt: string; description: string; source: string };
type SourceProvider = { id: string; label: string; live: boolean; configured: boolean };
type LivePlayer = {
  id: number; name: string; age: number | null; nationality: string | null; photoUrl: string | null; role: Role; position: string | null; shirtNumber: number | null;
  teamId: number; team: string; teamCode: string | null; teamLogo: string | null; statsSeason: number | null; appearances: number; starts: number; minutes: number;
  rating: number | null; goals: number; assists: number; shotsTotal: number; shotsOn: number; passesTotal: number; keyPasses: number; passAccuracy: number;
  dribblesAttempts: number; dribblesSuccess: number; tackles: number; injured: boolean; injuries: number; injuryNote: string | null; quoteEstimate: number;
  officialQuote: number | null; officialFvm: number | null; officialRole: string | null; score: number; potential: number; updatedAt: string | null;
  previousTeam: string | null; previousLeague: string | null; previousCountry: string | null; performanceOrigin: "serie-a" | "incoming-transfer" | null;
};

type Player = {
  id: number;
  name: string;
  role: Role;
  club: string;
  clubCode: string;
  age: number;
  price: number;
  priceDelta: number;
  score: number;
  form: number;
  starter: number;
  risk: "Basso" | "Medio" | "Alto";
  goals: number;
  assists: number;
  shots: number;
  passes: number;
  dribbles: number;
  injuries: number;
  minutes: number;
  trend: number[];
  verdict: "Compra" | "Tratta" | "Aspetta";
  ceiling: string;
  why: string;
  watch: string;
  news: string;
  newsTone: "up" | "flat" | "down";
  statsTeam?: string | null;
  statsLeague?: string | null;
  statsSeason?: number | null;
  dataOrigin?: "serie-a" | "incoming-transfer" | null;
};

const players: Player[] = [
  { id: 1, name: "Mile Svilar", role: "P", club: "Roma", clubCode: "ROM", age: 26, price: 16, priceDelta: 2, score: 88, form: 86, starter: 96, risk: "Basso", goals: 0, assists: 0, shots: 0, passes: 28.6, dribbles: 0, injuries: 0, minutes: 3420, trend: [71, 74, 79, 77, 83, 86], verdict: "Compra", ceiling: "Top 3 di ruolo", why: "Titolarità blindata, continuità e alto volume di parate. Il sovrapprezzo è sostenibile fino a 18 crediti.", watch: "Difesa romanista ancora da assestare", news: "Gerarchie confermate nel precampionato", newsTone: "up" },
  { id: 2, name: "Michele Di Gregorio", role: "P", club: "Juventus", clubCode: "JUV", age: 29, price: 14, priceDelta: 0, score: 82, form: 80, starter: 91, risk: "Basso", goals: 0, assists: 0, shots: 0, passes: 31.2, dribbles: 0, injuries: 1, minutes: 3060, trend: [77, 79, 76, 81, 82, 80], verdict: "Tratta", ceiling: "Prima fascia", why: "Profilo regolare e buona squadra davanti. Interessante se resta sotto la soglia dei 15 crediti.", watch: "Possibile rotazione nelle coppe", news: "Concorrenza interna sotto osservazione", newsTone: "flat" },
  { id: 3, name: "Federico Dimarco", role: "D", club: "Inter", clubCode: "INT", age: 28, price: 24, priceDelta: 3, score: 91, form: 89, starter: 88, risk: "Medio", goals: 4, assists: 9, shots: 1.48, passes: 42.7, dribbles: 1.1, injuries: 2, minutes: 2690, trend: [78, 82, 84, 88, 86, 91], verdict: "Compra", ceiling: "Premium da bonus", why: "Produce come un centrocampista e ha una catena di gioco stabile. Va pagato, ma con un tetto disciplinato.", watch: "Minutaggio gestito nei cicli ravvicinati", news: "Centrale nel nuovo assetto offensivo", newsTone: "up" },
  { id: 4, name: "Alessandro Bastoni", role: "D", club: "Inter", clubCode: "INT", age: 27, price: 17, priceDelta: 1, score: 85, form: 84, starter: 94, risk: "Basso", goals: 1, assists: 6, shots: 0.51, passes: 64.8, dribbles: 0.6, injuries: 1, minutes: 3024, trend: [75, 77, 80, 81, 83, 85], verdict: "Compra", ceiling: "Top affidabilità", why: "Minuti, costruzione e assist potenziali: un difensore su cui impostare il reparto senza rincorrere l'hype.", watch: "Meno pericoloso sui piazzati", news: "Leadership tecnica in crescita", newsTone: "up" },
  { id: 5, name: "Giovanni Di Lorenzo", role: "D", club: "Napoli", clubCode: "NAP", age: 33, price: 13, priceDelta: -1, score: 78, form: 76, starter: 92, risk: "Medio", goals: 3, assists: 4, shots: 0.72, passes: 48.1, dribbles: 0.7, injuries: 0, minutes: 3245, trend: [83, 82, 80, 79, 77, 76], verdict: "Tratta", ceiling: "Titolarissimo", why: "Il calo di prezzo crea valore. Pochi picchi, ma garantisce presenza e copertura in un reparto ambizioso.", watch: "Età e carico stagionale", news: "Quota in raffreddamento: possibile affare", newsTone: "flat" },
  { id: 6, name: "Scott McTominay", role: "C", club: "Napoli", clubCode: "NAP", age: 29, price: 31, priceDelta: 5, score: 93, form: 94, starter: 95, risk: "Basso", goals: 12, assists: 6, shots: 2.31, passes: 37.4, dribbles: 1.0, injuries: 0, minutes: 3150, trend: [77, 80, 85, 88, 92, 94], verdict: "Compra", ceiling: "Primo slot", why: "Inserimenti, presenza in area e continuità da attaccante aggiunto. È il riferimento del reparto, senza inseguirlo oltre 35.", watch: "Prezzo già vicino al massimo", news: "Hype alto, fondamentali ancora solidi", newsTone: "up" },
  { id: 7, name: "Christian Pulisic", role: "C", club: "Milan", clubCode: "MIL", age: 27, price: 29, priceDelta: 2, score: 89, form: 88, starter: 90, risk: "Medio", goals: 11, assists: 8, shots: 2.02, passes: 34.5, dribbles: 1.7, injuries: 2, minutes: 2870, trend: [82, 85, 83, 87, 90, 88], verdict: "Compra", ceiling: "Top da bonus", why: "Doppia cifra potenziale e responsabilità offensive. La classificazione a centrocampo ne alza nettamente il valore.", watch: "Gestione fisica e rigori da confermare", news: "Provato vicino alla porta", newsTone: "up" },
  { id: 8, name: "Riccardo Orsolini", role: "C", club: "Bologna", clubCode: "BOL", age: 29, price: 23, priceDelta: -1, score: 83, form: 82, starter: 87, risk: "Medio", goals: 10, assists: 4, shots: 2.18, passes: 25.6, dribbles: 1.5, injuries: 1, minutes: 2510, trend: [80, 85, 81, 83, 84, 82], verdict: "Tratta", ceiling: "Secondo slot", why: "Tiro e bonus restano sopra la media. La quota in discesa offre una finestra interessante, ma serve copertura.", watch: "Minuti e assetto tattico", news: "Mercato silenzioso, prezzo più razionale", newsTone: "flat" },
  { id: 9, name: "Lautaro Martínez", role: "A", club: "Inter", clubCode: "INT", age: 28, price: 47, priceDelta: 4, score: 94, form: 92, starter: 94, risk: "Basso", goals: 21, assists: 7, shots: 3.42, passes: 24.8, dribbles: 1.2, injuries: 1, minutes: 3040, trend: [86, 89, 91, 88, 93, 92], verdict: "Compra", ceiling: "Top assoluto", why: "Volume di tiro, ruolo e squadra danno una base di bonus superiore. L'investimento è sensato fino al 10% del budget.", watch: "Possibile gestione post impegni estivi", news: "Consenso alto, nessun segnale d'allarme", newsTone: "up" },
  { id: 10, name: "Moise Kean", role: "A", club: "Fiorentina", clubCode: "FIO", age: 26, price: 39, priceDelta: 6, score: 88, form: 90, starter: 96, risk: "Medio", goals: 19, assists: 3, shots: 3.05, passes: 17.9, dribbles: 1.3, injuries: 2, minutes: 2980, trend: [72, 77, 82, 86, 91, 90], verdict: "Aspetta", ceiling: "Primo slot", why: "Numeri da leader, ma l'hype incorpora già molto upside. Meglio entrare solo se l'asta non supera 40 crediti.", watch: "Prezzo e dipendenza dal gol", news: "Il nome più battuto nelle leghe private", newsTone: "down" },
  { id: 11, name: "Artem Dovbyk", role: "A", club: "Roma", clubCode: "ROM", age: 29, price: 30, priceDelta: -4, score: 80, form: 77, starter: 82, risk: "Medio", goals: 13, assists: 3, shots: 2.44, passes: 18.3, dribbles: 0.6, injuries: 3, minutes: 2420, trend: [84, 82, 79, 76, 78, 77], verdict: "Tratta", ceiling: "Rilancio", why: "La correzione di prezzo compensa parte del rischio. Profilo da trattare, non da comprare a ogni costo.", watch: "Condizione e concorrenza", news: "Fiducia divisa: occasione se scende", newsTone: "flat" },
  { id: 12, name: "Ange-Yoan Bonny", role: "A", club: "Inter", clubCode: "INT", age: 22, price: 18, priceDelta: 5, score: 79, form: 83, starter: 61, risk: "Medio", goals: 8, assists: 4, shots: 1.94, passes: 16.4, dribbles: 1.8, injuries: 1, minutes: 2100, trend: [63, 68, 72, 75, 79, 83], verdict: "Aspetta", ceiling: "Scommessa ad alto upside", why: "Età e contesto alzano il potenziale, ma la titolarità non giustifica una guerra di rilanci.", watch: "Gerarchie e adattamento", news: "Hype da trasferimento sopra i minuti attesi", newsTone: "down" },
];

const transfers = [
  { player: "Ange-Yoan Bonny", from: "Parma", to: "Inter", type: "Acquisto", impact: "+12", note: "Attacco più competitivo, minuti da verificare" },
  { player: "Samuele Ricci", from: "Torino", to: "Milan", type: "Acquisto", impact: "+8", note: "Regia e titolarità potenziale" },
  { player: "Jonathan David", from: "Lille", to: "Juventus", type: "Parametro zero", impact: "+15", note: "Profilo da bonus, quota da non inseguire" },
  { player: "Luca Marianucci", from: "Empoli", to: "Napoli", type: "Acquisto", impact: "+4", note: "Prospetto da monitorare, non da asta iniziale" },
];

const roleLabels: Record<Role, string> = { P: "Portieri", D: "Difensori", C: "Centrocampisti", A: "Attaccanti" };
const verdictLabels = { Compra: "Via libera", Tratta: "Tratta", Aspetta: "Aspetta" };
const LEAGUE_BUDGET = 250;

function clampScore(value: number) {
  return Math.min(100, Math.max(0, value));
}

function radarPlayer(player: LivePlayer): Player {
  const hasHistory = player.statsSeason !== null && (player.appearances >= 3 || player.minutes >= 180);
  const price = Math.round(player.officialQuote ?? player.quoteEstimate);
  const starter = player.appearances ? clampScore((player.starts / player.appearances) * 100) : 0;
  const performance = hasHistory ? player.score : 25;
  const form = hasHistory ? (player.rating === null ? clampScore(player.score) : clampScore((player.rating - 5) * 42)) : 25;
  const availability = player.injured ? 25 : clampScore(100 - player.injuries * 9);
  const value = clampScore(performance * .72 + player.potential * .28 - price * 1.05 + 22);
  const score = Math.round(clampScore(performance * .42 + starter * .19 + player.potential * .17 + value * .16 + availability * .06));
  const risk: Player["risk"] = player.injured || player.injuries >= 4 ? "Alto" : player.injuries >= 2 || starter < 55 ? "Medio" : "Basso";
  const verdict: Player["verdict"] = !hasHistory ? "Aspetta" : score >= 72 && value >= 62 ? "Compra" : score >= 58 ? "Tratta" : "Aspetta";
  const origin = player.previousTeam && player.previousTeam !== player.team
    ? `${player.previousTeam}${player.previousLeague ? `, ${player.previousLeague}` : ""}`
    : player.previousLeague ?? "campionato precedente";
  const youthText = player.age !== null && player.age <= 23 ? " Il potenziale legato all’età aumenta il margine di crescita." : "";
  const why = hasHistory
    ? `Ranking automatico: rendimento ${Math.round(player.score)}/100, titolarità ${Math.round(starter)}% e rapporto qualità/prezzo ${Math.round(value)}/100. Dati ${player.statsSeason} da ${origin}.${youthText}`
    : `Profilo reale della rosa Serie A in attesa dello storico prestazionale. Il sistema non assegna un via libera finché presenze, minuti e campionato precedente non sono verificati.${youthText}`;
  const watch = !hasHistory ? "Sincronizzazione della stagione precedente in corso" : player.injured ? player.injuryNote ?? "Condizione fisica da verificare" : player.previousTeam && player.previousTeam !== player.team ? "Adattamento alla Serie A e nuova gerarchia" : starter < 60 ? "Titolarità da consolidare" : price >= 30 ? "Non superare il tetto di spesa" : "Confermare ruolo e minuti nel precampionato";
  const news = !hasHistory ? "Dati reali di rosa disponibili; storico prestazionale ancora da importare" : player.previousTeam && player.previousTeam !== player.team
    ? `Nuovo in Italia: rendimento precedente con ${origin}`
    : `Classifica aggiornata sui numeri della stagione ${player.statsSeason ?? "precedente"}`;
  const trendBase = Math.max(18, score - 10);
  return {
    id: player.id,
    name: player.name,
    role: player.role,
    club: player.team,
    clubCode: (player.teamCode ?? player.team.slice(0, 3)).toUpperCase(),
    age: player.age ?? 28,
    price,
    priceDelta: 0,
    score,
    form: Math.round(form),
    starter: Math.round(starter),
    risk,
    goals: player.goals,
    assists: player.assists,
    shots: player.appearances ? Number((player.shotsOn / player.appearances).toFixed(2)) : 0,
    passes: player.appearances ? Number((player.passesTotal / player.appearances).toFixed(1)) : 0,
    dribbles: player.appearances ? Number((player.dribblesSuccess / player.appearances).toFixed(1)) : 0,
    injuries: player.injuries,
    minutes: player.minutes,
    trend: [trendBase, Math.max(20, score - 7), Math.max(20, Math.round((score + form) / 2) - 4), Math.max(20, score - 3), Math.max(20, Math.round((score + value) / 2)), score],
    verdict,
    ceiling: player.age !== null && player.age <= 23 ? "Prospetto ad alto margine" : score >= 82 ? "Prima fascia di ruolo" : verdict === "Compra" ? "Titolare di valore" : "Profilo da rotazione",
    why,
    watch,
    news,
    newsTone: verdict === "Compra" ? "up" : verdict === "Aspetta" ? "down" : "flat",
    statsTeam: player.previousTeam,
    statsLeague: player.previousLeague,
    statsSeason: player.statsSeason,
    dataOrigin: player.performanceOrigin,
  };
}

function PlayerMark({ player, size = "normal" }: { player: Player; size?: "normal" | "large" }) {
  return <div className={`player-mark club-${player.clubCode.toLowerCase()} ${size === "large" ? "large" : ""}`} aria-hidden="true">{player.name.split(" ").map(n => n[0]).slice(-2).join("")}</div>;
}

function MiniTrend({ values }: { values: number[] }) {
  const min = Math.min(...values) - 4;
  const max = Math.max(...values) + 4;
  return (
    <div className="mini-trend" aria-label={`Andamento da ${values[0]} a ${values[values.length - 1]}`}>
      {values.map((value, index) => <span key={index} style={{ height: `${Math.max(16, ((value - min) / (max - min)) * 100)}%` }} />)}
    </div>
  );
}

function newsAge(value: string) {
  const published = new Date(value).getTime();
  if (!Number.isFinite(published)) return "Adesso";
  const minutes = Math.max(1, Math.round((Date.now() - published) / 60000));
  if (minutes < 60) return `${minutes} min fa`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "ora" : "ore"} fa`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "giorno" : "giorni"} fa`;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("radar");
  const [role, setRole] = useState<Role | "Tutti">("Tutti");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(6);
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [compare, setCompare] = useState<number[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("Pronto per la sincronizzazione");
  const [sourceProviders, setSourceProviders] = useState<SourceProvider[]>([]);
  const [aiBudget] = useState(LEAGUE_BUDGET);
  const [aiFormation, setAiFormation] = useState("3-4-3");
  const [aiRisk, setAiRisk] = useState("Equilibrato");
  const [aiPlan, setAiPlan] = useState<AiPlan | null>(null);
  const [aiSource, setAiSource] = useState<"openai" | "simulazione" | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [reportStored, setReportStored] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportError, setReportError] = useState("");
  const [marketNews, setMarketNews] = useState<MarketNewsItem[]>([]);
  const [marketNewsSource, setMarketNewsSource] = useState<"sosfanta" | "gnews" | "unavailable" | null>(null);
  const [marketNewsLoading, setMarketNewsLoading] = useState(true);
  const [livePlayers, setLivePlayers] = useState<LivePlayer[]>([]);
  const [rosterSource, setRosterSource] = useState<"api-football" | "demo" | null>(null);
  const [rosterMessage, setRosterMessage] = useState("");
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterQuery, setRosterQuery] = useState("");
  const [rosterRole, setRosterRole] = useState<Role | "Tutti">("Tutti");
  const [rosterAge, setRosterAge] = useState<"Tutti" | "U21" | "U23" | "U25">("Tutti");
  const [rosterTeam, setRosterTeam] = useState("Tutte");
  const [rosterSort, setRosterSort] = useState<"score" | "potential" | "value">("score");
  const [rosterPage, setRosterPage] = useState(0);
  const [rosterOnlyShortlist, setRosterOnlyShortlist] = useState(false);
  const [selectedLiveId, setSelectedLiveId] = useState<number | null>(null);
  const [historyLoadingId, setHistoryLoadingId] = useState<number | null>(null);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("undici-shortlist");
    if (saved) {
      const parsed = JSON.parse(saved) as Array<string | number>;
      // Ripristino una preferenza del browser dopo il primo render client.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShortlist(parsed.map((item) => typeof item === "number" ? `radar:${item}` : item));
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("undici-shortlist", JSON.stringify(shortlist));
  }, [shortlist]);

  useEffect(() => {
    if (selectedLiveId === null) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setSelectedLiveId(null);
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedLiveId]);

  useEffect(() => {
    if (tab !== "ai" || dailyReport) return;
    fetch("/api/reports/latest", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { report?: DailyReport; stored?: boolean }) => {
        if (data.report) setDailyReport(data.report);
        setReportStored(Boolean(data.stored));
      })
      .catch(() => setDailyReport(null));
  }, [tab, dailyReport]);

  useEffect(() => {
    if ((tab !== "rosa" && tab !== "radar") || rosterSource || rosterLoading) return;
    // Radar e rosa condividono la stessa base live, caricata una sola volta.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRosterLoading(true);
    fetch("/api/players", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { players?: LivePlayer[]; source?: "api-football" | "demo"; message?: string }) => {
        setLivePlayers(data.players ?? []);
        setRosterSource(data.source ?? "demo");
        setRosterMessage(data.message ?? "");
      })
      .catch(() => { setRosterSource("demo"); setRosterMessage("Rosa completa temporaneamente non disponibile."); })
      .finally(() => setRosterLoading(false));
  }, [tab, rosterSource, rosterLoading]);

  useEffect(() => {
    if (tab !== "mercato" || marketNewsSource) return;
    fetch("/api/news/market", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { news?: MarketNewsItem[]; source?: "sosfanta" | "gnews" | "unavailable" }) => {
        setMarketNews(data.news ?? []);
        setMarketNewsSource(data.source ?? "unavailable");
      })
      .catch(() => setMarketNewsSource("unavailable"))
      .finally(() => setMarketNewsLoading(false));
  }, [tab, marketNewsSource]);

  const radarPlayers = useMemo(() => {
    const ranked = livePlayers
      .map(radarPlayer)
      .sort((a, b) => b.score - a.score || b.form - a.form);
    if (!ranked.length) return players;
    return (["P", "D", "C", "A"] as Role[])
      .flatMap((item) => ranked.filter((player) => player.role === item).slice(0, 8))
      .sort((a, b) => b.score - a.score || b.form - a.form);
  }, [livePlayers]);
  const radarOpportunityCount = radarPlayers.filter((player) => player.verdict !== "Aspetta").length;
  const filtered = useMemo(() => radarPlayers
    .filter(p => role === "Tutti" || p.role === role)
    .filter(p => `${p.name} ${p.club}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.score - a.score), [radarPlayers, role, query]);

  const selected = radarPlayers.find(p => p.id === selectedId) ?? radarPlayers[0];
  const comparedPlayers = compare.map(id => radarPlayers.find(p => p.id === id)).filter(Boolean) as Player[];
  const rosterTeams = useMemo(() => [...new Set(livePlayers.map((player) => player.team))].sort((a, b) => a.localeCompare(b, "it")), [livePlayers]);
  const radarShortlistNames = useMemo(() => new Set(shortlist
    .filter((key) => key.startsWith("radar:"))
    .map((key) => radarPlayers.find((player) => player.id === Number(key.slice(6)))?.name ?? players.find((player) => player.id === Number(key.slice(6)))?.name)
    .filter(Boolean) as string[]), [shortlist, radarPlayers]);
  const filteredRoster = useMemo(() => livePlayers
    .filter((player) => !rosterOnlyShortlist || shortlist.includes(`roster:${player.id}`) || radarShortlistNames.has(player.name))
    .filter((player) => rosterRole === "Tutti" || player.role === rosterRole)
    .filter((player) => rosterTeam === "Tutte" || player.team === rosterTeam)
    .filter((player) => rosterAge === "Tutti" || (player.age !== null && player.age <= Number(rosterAge.slice(1))))
    .filter((player) => `${player.name} ${player.team}`.toLocaleLowerCase("it").includes(rosterQuery.toLocaleLowerCase("it")))
    .sort((a, b) => rosterSort === "potential" ? b.potential - a.potential : rosterSort === "value" ? (b.score + b.potential - b.quoteEstimate * 2) - (a.score + a.potential - a.quoteEstimate * 2) : b.score - a.score), [livePlayers, rosterRole, rosterTeam, rosterAge, rosterQuery, rosterSort, rosterOnlyShortlist, shortlist, radarShortlistNames]);
  const rosterPageSize = 36;
  const rosterPages = Math.max(1, Math.ceil(filteredRoster.length / rosterPageSize));
  const rosterPagePlayers = filteredRoster.slice(rosterPage * rosterPageSize, (rosterPage + 1) * rosterPageSize);
  const selectedLive = selectedLiveId === null ? null : livePlayers.find((player) => player.id === selectedLiveId) ?? null;
  const selectedLiveHasHistory = Boolean(selectedLive?.statsSeason !== null && selectedLive?.statsSeason !== undefined && ((selectedLive?.appearances ?? 0) > 0 || (selectedLive?.minutes ?? 0) > 0));
  const rosterShortlistCount = livePlayers.filter((player) => shortlist.includes(`roster:${player.id}`) || radarShortlistNames.has(player.name)).length;

  function toggleShortlist(key: string) {
    setShortlist(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key]);
  }

  function isLiveShortlisted(player: LivePlayer) {
    return shortlist.includes(`roster:${player.id}`) || shortlist.includes(`radar:${player.id}`) || radarShortlistNames.has(player.name);
  }

  function toggleLiveShortlist(player: LivePlayer) {
    const equivalentKeys = [`roster:${player.id}`, `radar:${player.id}`, ...radarPlayers.filter((item) => item.name === player.name).map((item) => `radar:${item.id}`), ...players.filter((item) => item.name === player.name).map((item) => `radar:${item.id}`)];
    setShortlist((current) => equivalentKeys.some((key) => current.includes(key))
      ? current.filter((key) => !equivalentKeys.includes(key))
      : [...current, `roster:${player.id}`]);
  }

  async function openLivePlayer(player: LivePlayer) {
    setSelectedLiveId(player.id);
    setHistoryError("");
    const hasHistory = player.statsSeason !== null && (player.appearances > 0 || player.minutes > 0);
    if (hasHistory || historyLoadingId === player.id) return;

    setHistoryLoadingId(player.id);
    try {
      const response = await fetch(`/api/players/${player.id}/history`, { cache: "no-store" });
      const data = await response.json() as { player?: LivePlayer; error?: string };
      if (!response.ok || !data.player) throw new Error(data.error ?? "Storico del giocatore non disponibile");
      setLivePlayers((current) => current.map((item) => item.id === data.player?.id ? data.player : item));
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Storico del giocatore non disponibile");
    } finally {
      setHistoryLoadingId(null);
    }
  }

  function toggleCompare(id: number) {
    setCompare(current => current.includes(id) ? current.filter(item => item !== id) : current.length < 3 ? [...current, id] : [current[1], current[2], id]);
  }

  async function syncSources() {
    setSyncing(true);
    setSyncMessage("Controllo delle fonti in corso…");
    try {
      const response = await fetch("/api/sync", { cache: "no-store" });
      const data = await response.json() as { providers: SourceProvider[]; checkedAt: string };
      const live = data.providers.filter((provider) => provider.live).length;
      const unavailable = data.providers.filter((provider) => !provider.live).map((provider) => provider.label);
      setSourceProviders(data.providers);
      setSyncMessage(`${live}/${data.providers.length} fonti operative · ${new Date(data.checkedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}${unavailable.length ? ` · Non disponibile: ${unavailable.join(", ")}` : ""}`);
    } catch {
      setSyncMessage("Connessione non disponibile: dati demo preservati");
    } finally {
      setSyncing(false);
    }
  }

  function sourceBadge(id: string, fallback: string) {
    const provider = sourceProviders.find((item) => item.id === id);
    if (!provider) return { label: fallback, className: id === "football-data" || id === "thesportsdb" || id === "supabase" ? "ready" : "key" };
    return provider.live
      ? { label: "Operativa", className: "ready" }
      : { label: provider.configured ? "Non raggiungibile" : "Non configurata", className: "off" };
  }

  async function buildAiPlan() {
    setAiLoading(true);
    setAiError("");
    try {
      const response = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: aiBudget, formation: aiFormation, risk: aiRisk }),
      });
      const data = await response.json() as { plan?: AiPlan; source?: "openai" | "simulazione"; error?: string };
      if (!response.ok || !data.plan) throw new Error(data.error ?? "Il DS AI non ha completato l’analisi.");
      setAiPlan(data.plan);
      setAiSource(data.source ?? "simulazione");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Connessione AI non disponibile.");
    } finally {
      setAiLoading(false);
    }
  }

  async function generateReportNow() {
    setReportGenerating(true);
    setReportError("");
    try {
      const response = await fetch("/api/reports/generate", { method: "POST" });
      const data = await response.json() as { report?: DailyReport; stored?: boolean; error?: string };
      if (!response.ok || !data.report) throw new Error(data.error ?? "Il report AI non è stato completato.");
      setDailyReport(data.report);
      setReportStored(Boolean(data.stored));
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Connessione AI non disponibile.");
    } finally {
      setReportGenerating(false);
    }
  }

  return (
    <main>
      <div className="data-banner">SCENARIO PRE-ASTA 2026/27 <span>•</span> Budget lega 250 crediti <span>•</span> Ranking live, quotazioni UNDICI non ufficiali</div>
      <header className="topbar">
        <button className="brand" onClick={() => setTab("radar")} aria-label="Vai alla home">
          <span className="brand-mark">U</span>
          <span><b>UNDICI</b><small>Scouting room</small></span>
        </button>
        <nav aria-label="Navigazione principale">
          <button className={tab === "radar" ? "active" : ""} onClick={() => setTab("radar")}>Radar asta</button>
          <button className={tab === "rosa" ? "active" : ""} onClick={() => setTab("rosa")}>Serie A</button>
          <button className={tab === "mercato" ? "active" : ""} onClick={() => setTab("mercato")}>Trasferimenti</button>
          <button className={tab === "confronta" ? "active" : ""} onClick={() => setTab("confronta")}>Confronta <span className="nav-count">{compare.length}</span></button>
          <button className={tab === "ai" ? "active" : ""} onClick={() => setTab("ai")}>DS AI <span className="ai-nav-dot" /></button>
          <button className={tab === "fonti" ? "active" : ""} onClick={() => setTab("fonti")}>Fonti</button>
        </nav>
        <div className="header-actions">
          <button className="shortlist-button" onClick={() => { setRosterOnlyShortlist(true); setRosterPage(0); setTab("rosa"); }}><span>☆</span> Shortlist <b>{shortlist.length}</b></button>
          <button className="avatar" aria-label="Profilo direttore sportivo">DS</button>
        </div>
      </header>

      {tab === "radar" && (
        <>
          <section className="hero">
            <div>
              <p className="eyebrow">SERIE A · STAGIONE 2026/27</p>
              <h1>Il tuo vantaggio<br />prima dell’asta.</h1>
              <p className="hero-copy">Classifica automatica sulla stagione precedente, anche per chi arriva da un campionato estero. Rendimento, titolarità, età, prezzo e rischio in un’unica decisione.</p>
            </div>
            <div className="hero-summary">
              <div className="summary-top"><span>Radar opportunità</span><small>RANKING LIVE</small></div>
              <strong>{radarOpportunityCount}</strong><span className="summary-label">profili da comprare o trattare</span>
              <div className="summary-meter"><i style={{ width: `${Math.min(100, Math.round((radarOpportunityCount / Math.max(1, radarPlayers.length)) * 100))}%` }} /></div>
              <div className="summary-bottom"><span>{rosterSource === "api-football" ? `${radarPlayers.length} classificati` : "Caricamento dati live"}</span><button onClick={() => setTab("mercato")}>Apri mercato →</button></div>
            </div>
          </section>

          <section className="workspace">
            <div className="board">
              <div className="board-head">
                <div><p className="section-kicker">CLASSIFICA AUTOMATICA · AGGIORNAMENTO GIORNALIERO</p><h2>I migliori per ruolo</h2></div>
                <label className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cerca giocatore o club" aria-label="Cerca giocatore o club" /></label>
              </div>
              <div className="role-filters" aria-label="Filtra per ruolo">
                {(["Tutti", "P", "D", "C", "A"] as const).map(item => <button key={item} onClick={() => setRole(item)} className={role === item ? "active" : ""}>{item === "Tutti" ? "Tutti" : roleLabels[item]}<span>{item === "Tutti" ? radarPlayers.length : radarPlayers.filter(p => p.role === item).length}</span></button>)}
              </div>
              <div className="table-labels"><span>Giocatore</span><span>Forma</span><span>Quota</span><span>DS score</span><span>Decisione</span><span /></div>
              <div className="player-list">
                {filtered.map(player => (
                  <article key={player.id} className={`player-row ${selected.id === player.id ? "selected" : ""}`} onClick={() => setSelectedId(player.id)}>
                    <div className="player-cell"><span className="ranking-position">{String(radarPlayers.findIndex((item) => item.id === player.id) + 1).padStart(2, "0")}</span><PlayerMark player={player} /><div><strong>{player.name}</strong><small><b>{player.role}</b> {player.club} · {player.age} anni</small></div></div>
                    <MiniTrend values={player.trend} />
                    <div className="price"><strong>{player.price}</strong><small>crediti</small></div>
                    <div className="score"><strong>{player.score}</strong><span>/100</span></div>
                    <span className={`verdict verdict-${player.verdict.toLowerCase()}`}>{verdictLabels[player.verdict]}</span>
                    <div className="row-actions">
                      <button className={compare.includes(player.id) ? "on" : ""} onClick={e => { e.stopPropagation(); toggleCompare(player.id); }} aria-label={`Confronta ${player.name}`}>⇄</button>
                      <button className={shortlist.includes(`radar:${player.id}`) ? "saved" : ""} onClick={e => { e.stopPropagation(); toggleShortlist(`radar:${player.id}`); }} aria-label={`Salva ${player.name}`}>{shortlist.includes(`radar:${player.id}`) ? "★" : "☆"}</button>
                    </div>
                  </article>
                ))}
                {filtered.length === 0 && <div className="empty-state">Nessun giocatore corrisponde ai filtri.</div>}
              </div>
            </div>

            <aside className="player-detail">
              <div className="detail-top">
                <PlayerMark player={selected} size="large" />
                <div><span className="role-chip">{roleLabels[selected.role]}</span><h2>{selected.name}</h2><p>{selected.club} · {selected.age} anni</p></div>
                <button className={shortlist.includes(`radar:${selected.id}`) ? "detail-save saved" : "detail-save"} onClick={() => toggleShortlist(`radar:${selected.id}`)}>{shortlist.includes(`radar:${selected.id}`) ? "★" : "☆"}</button>
              </div>
              <div className="decision-card">
                <div><span>VERDETTO DS</span><strong>{verdictLabels[selected.verdict]}</strong></div>
                <div className="decision-score">{selected.score}<small>/100</small></div>
                <p>{selected.why}</p>
                <div className="bid-line"><span>Quota attuale <b>{selected.price}</b></span><span>Tetto consigliato <b>{selected.price + (selected.verdict === "Compra" ? 2 : 0)}</b></span></div>
              </div>
              <div className="metric-grid">
                <div><span>Gol</span><strong>{selected.goals}</strong><small>stagione prec.</small></div>
                <div><span>Assist</span><strong>{selected.assists}</strong><small>stagione prec.</small></div>
                <div><span>Tiri / 90</span><strong>{selected.shots}</strong><small>verso la porta</small></div>
                <div><span>Passaggi / 90</span><strong>{selected.passes}</strong><small>volume medio</small></div>
                <div><span>Dribbling / 90</span><strong>{selected.dribbles}</strong><small>riusciti</small></div>
                <div><span>Stop fisici</span><strong>{selected.injuries}</strong><small>ultimi 12 mesi</small></div>
              </div>
              <div className="confidence">
                <div><span>Titolarità</span><b>{selected.starter}%</b></div><i><em style={{ width: `${selected.starter}%` }} /></i>
                <div><span>Forma</span><b>{selected.form}%</b></div><i><em style={{ width: `${selected.form}%` }} /></i>
              </div>
              <div className="news-signal">
                <span className={`signal-dot ${selected.newsTone}`} />
                <div><small>SEGNALE NOTIZIE</small><p>{selected.news}</p></div>
              </div>
              <div className="watch"><span>Da controllare</span><p>{selected.watch}</p></div>
              <button className="compare-cta" onClick={() => { toggleCompare(selected.id); setTab("confronta"); }}>Apri nel comparatore <span>→</span></button>
            </aside>
          </section>
        </>
      )}

      {tab === "rosa" && (
        <section className="page-section roster-page">
          <div className="page-heading roster-heading">
            <div><p className="eyebrow">DATABASE SERIE A · 2026/27</p><h1>Tutti i giocatori.<br />Prima i giovani.</h1></div>
            <div className="roster-intro"><p>Rose complete, rendimento precedente e potenziale. Le quotazioni sono indicate come ufficiali solo quando provengono dal Listone; fino ad allora vedi la stima UNDICI.</p><div className={`roster-source ${rosterSource ?? "loading"}`}><span />{rosterLoading ? "Caricamento rosa…" : rosterSource === "api-football" ? `${livePlayers.length} giocatori · API-Football live` : "Anteprima · prima sincronizzazione in attesa"}</div></div>
          </div>
          {rosterMessage && <div className="roster-notice"><b>Sincronizzazione programmata</b><span>{rosterMessage}</span></div>}
          <div className="roster-toolbar">
            <label className="roster-search"><span>⌕</span><input value={rosterQuery} onChange={(event) => { setRosterQuery(event.target.value); setRosterPage(0); }} placeholder="Cerca giocatore o squadra" aria-label="Cerca nella rosa Serie A" /></label>
            <select value={rosterTeam} onChange={(event) => { setRosterTeam(event.target.value); setRosterPage(0); }} aria-label="Filtra per squadra"><option>Tutte</option>{rosterTeams.map((team) => <option key={team}>{team}</option>)}</select>
            <select value={rosterAge} onChange={(event) => { setRosterAge(event.target.value as typeof rosterAge); setRosterPage(0); }} aria-label="Filtra per età"><option>Tutti</option><option>U21</option><option>U23</option><option>U25</option></select>
            <select value={rosterSort} onChange={(event) => { setRosterSort(event.target.value as typeof rosterSort); setRosterPage(0); }} aria-label="Ordina giocatori"><option value="score">DS score</option><option value="potential">Potenziale giovani</option><option value="value">Qualità / prezzo</option></select>
          </div>
          <div className="roster-role-filters">
            {(["Tutti", "P", "D", "C", "A"] as const).map((item) => <button key={item} className={rosterRole === item ? "active" : ""} onClick={() => { setRosterRole(item); setRosterPage(0); }}>{item === "Tutti" ? "Tutti i ruoli" : roleLabels[item]}<span>{item === "Tutti" ? livePlayers.length : livePlayers.filter((player) => player.role === item).length}</span></button>)}
          </div>
          <div className="roster-result-line">
            <span><b>{filteredRoster.length}</b> profili trovati</span>
            <div className="roster-result-actions">
              <button className={rosterOnlyShortlist ? "active" : ""} onClick={() => { setRosterOnlyShortlist((current) => !current); setRosterPage(0); }}>★ {rosterOnlyShortlist ? "Mostra tutti" : "Solo shortlist"} <b>{rosterShortlistCount}</b></button>
              <small>{rosterSource === "api-football" ? "Statistiche ultima stagione disponibile" : "Dati dimostrativi"}</small>
            </div>
          </div>
          <div className="roster-grid">
            {rosterPagePlayers.map((player) => <article className="roster-card" key={player.id} role="button" tabIndex={0} onClick={() => openLivePlayer(player)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openLivePlayer(player); } }}>
              <div className="roster-card-top">
                {player.photoUrl ? <img src={player.photoUrl} alt="" loading="lazy" /> : <span className="roster-initials">{player.name.split(" ").map((part) => part[0]).slice(-2).join("")}</span>}
                <div><span className="role-chip">{roleLabels[player.role]}</span><h2>{player.name}</h2><p>{player.team}{player.age ? ` · ${player.age} anni` : ""}</p></div>
                {player.teamLogo && <img className="team-mini-logo" src={player.teamLogo} alt="" loading="lazy" />}
              </div>
              <div className={`performance-origin ${selected.dataOrigin === "incoming-transfer" ? "import" : selected.statsSeason === null ? "pending" : "italy"}`}><b>{selected.dataOrigin === "incoming-transfer" ? "NUOVO IN SERIE A" : selected.statsSeason === null ? "DATI IN SINCRONIZZAZIONE" : "STORICO PRECEDENTE"}</b><span>{selected.statsSeason ?? "Storico in attesa"} · {selected.statsTeam ?? selected.club}{selected.statsLeague ? ` · ${selected.statsLeague}` : ""}</span></div>
              <div className="roster-tags">{player.age && player.age <= 23 && <span className="young-tag">U23</span>}{player.potential >= 80 && <span className="talent-tag">ALTO POTENZIALE</span>}{player.injured && <span className="injury-tag">STOP</span>}</div>
              <div className="roster-scoreline"><div><small>DS SCORE</small><strong>{Math.round(player.score)}</strong></div><div><small>POTENZIALE</small><strong>{Math.round(player.potential)}</strong></div><div className="roster-quote"><small>{player.officialQuote !== null ? "QUOTA UFFICIALE" : "STIMA UNDICI"}</small><strong>{Math.round(player.officialQuote ?? player.quoteEstimate)}</strong><span>crediti</span></div></div>
              <div className="roster-stats"><span><small>Pres.</small><b>{player.appearances}</b></span><span><small>Gol</small><b>{player.goals}</b></span><span><small>Assist</small><b>{player.assists}</b></span><span><small>Tiri p.</small><b>{player.shotsOn}</b></span><span><small>Pass. chiave</small><b>{player.keyPasses}</b></span><span><small>Dribbling</small><b>{player.dribblesSuccess}</b></span></div>
              <div className="roster-card-foot"><span>{player.statsSeason ? `Numeri ${player.statsSeason}/${String(player.statsSeason + 1).slice(-2)}` : "Dati rosa attuale"}</span><b className={player.injured ? "risk-high" : "risk-low"}>{player.injured ? player.injuryNote ?? "Da verificare" : "Disponibile"}</b></div>
              <div className="roster-card-actions">
                <button onClick={(event) => { event.stopPropagation(); openLivePlayer(player); }}>Apri scheda <span>→</span></button>
                <button className={isLiveShortlisted(player) ? "saved" : ""} onClick={(event) => { event.stopPropagation(); toggleLiveShortlist(player); }} aria-label={`${isLiveShortlisted(player) ? "Rimuovi" : "Aggiungi"} ${player.name} ${isLiveShortlisted(player) ? "dalla" : "alla"} shortlist`}>{isLiveShortlisted(player) ? "★" : "☆"}</button>
              </div>
            </article>)}
            {!rosterLoading && rosterPagePlayers.length === 0 && <div className="roster-empty">{rosterOnlyShortlist ? "La shortlist Serie A è vuota. Disattiva il filtro o salva un giocatore con la stella." : "Nessun giocatore corrisponde ai filtri scelti."}</div>}
          </div>
          {filteredRoster.length > rosterPageSize && <div className="roster-pagination"><button disabled={rosterPage === 0} onClick={() => setRosterPage((page) => Math.max(0, page - 1))}>← Precedenti</button><span>Pagina {rosterPage + 1} di {rosterPages}</span><button disabled={rosterPage + 1 >= rosterPages} onClick={() => setRosterPage((page) => Math.min(rosterPages - 1, page + 1))}>Successivi →</button></div>}

          {selectedLive && <div className="roster-modal-backdrop" onClick={() => setSelectedLiveId(null)}>
            <aside className="roster-player-modal" role="dialog" aria-modal="true" aria-labelledby="live-player-title" onClick={(event) => event.stopPropagation()}>
              <button className="roster-modal-close" onClick={() => setSelectedLiveId(null)} aria-label="Chiudi scheda giocatore">×</button>
              <div className="roster-modal-head">
                {selectedLive.photoUrl ? <img src={selectedLive.photoUrl} alt="" /> : <span className="roster-modal-initials">{selectedLive.name.split(" ").map((part) => part[0]).slice(-2).join("")}</span>}
                <div><span className="role-chip">{roleLabels[selectedLive.role]}{selectedLive.position ? ` · ${selectedLive.position}` : ""}</span><h2 id="live-player-title">{selectedLive.name}</h2><p>{selectedLive.team}{selectedLive.age ? ` · ${selectedLive.age} anni` : ""}{selectedLive.nationality ? ` · ${selectedLive.nationality}` : ""}</p></div>
                {selectedLive.teamLogo && <img className="roster-modal-team" src={selectedLive.teamLogo} alt="" />}
              </div>
              <div className="roster-modal-summary">
                <div><small>DS SCORE</small><strong>{Math.round(selectedLive.score)}</strong></div>
                <div><small>POTENZIALE</small><strong>{Math.round(selectedLive.potential)}</strong></div>
                <div className="quote"><small>{selectedLive.officialQuote !== null ? "QUOTAZIONE UFFICIALE" : "STIMA UNDICI"}</small><strong>{Math.round(selectedLive.officialQuote ?? selectedLive.quoteEstimate)}</strong><span>crediti</span></div>
              </div>
              {historyLoadingId === selectedLive.id && <div className="roster-history-message loading"><span className="live-dot" /><div><b>Recupero dello storico in corso</b><p>Sto leggendo la stagione disponibile su API-Football e la salvo nel database.</p></div></div>}
              {historyError && historyLoadingId !== selectedLive.id && <div className="roster-history-message error"><div><b>Storico non ancora disponibile</b><p>{historyError}</p></div><button onClick={() => openLivePlayer(selectedLive)}>Riprova</button></div>}
              <div className="roster-modal-stats">
                {[["Presenze", selectedLive.appearances], ["Da titolare", selectedLive.starts], ["Minuti", selectedLive.minutes], ["Gol", selectedLive.goals], ["Assist", selectedLive.assists], ["Tiri in porta", selectedLive.shotsOn], ["Tiri totali", selectedLive.shotsTotal], ["Passaggi", selectedLive.passesTotal], ["Passaggi chiave", selectedLive.keyPasses], ["Precisione passaggi", `${selectedLive.passAccuracy}%`], ["Dribbling riusciti", selectedLive.dribblesSuccess], ["Infortuni", selectedLive.injuries], ["Contrasti", selectedLive.tackles], ["Rating", selectedLive.rating ?? "—"]].map(([label, value]) => <div key={String(label)}><small>{label}</small><b>{selectedLiveHasHistory || label === "Infortuni" ? value : "—"}</b></div>)}
              </div>
              <div className="roster-modal-status"><div><small>CONDIZIONE</small><b className={selectedLive.injured ? "risk-high" : "risk-low"}>{selectedLive.injured ? selectedLive.injuryNote ?? "Infortunio da verificare" : "Disponibile"}</b></div><p>{selectedLiveHasHistory ? `Statistiche reali stagione ${selectedLive.statsSeason}/${String((selectedLive.statsSeason ?? 0) + 1).slice(-2)}${selectedLive.previousTeam ? ` · ${selectedLive.previousTeam}` : ""}${selectedLive.previousLeague ? ` · ${selectedLive.previousLeague}` : ""}.` : historyLoadingId === selectedLive.id ? "Recupero dello storico in corso." : "Dati di rosa attuale; lo storico non è ancora disponibile."} Aggiornamento: {selectedLive.updatedAt ? new Date(selectedLive.updatedAt).toLocaleDateString("it-IT") : "fonte live"}.</p></div>
              <button className={`roster-modal-save ${isLiveShortlisted(selectedLive) ? "saved" : ""}`} onClick={() => toggleLiveShortlist(selectedLive)}>{isLiveShortlisted(selectedLive) ? "★ Nella shortlist" : "☆ Aggiungi alla shortlist"}</button>
            </aside>
          </div>}
        </section>
      )}

      {tab === "mercato" && (
        <section className="page-section">
          <div className="page-heading"><p className="eyebrow">MARKET INTELLIGENCE</p><h1>Il mercato cambia<br />le gerarchie.</h1><p>Ogni trasferimento viene tradotto in impatto fantacalcistico: titolarità, ruolo, concorrenza e prezzo.</p></div>
          <div className="market-layout">
            <div className="transfer-list">
              <div className="section-title"><h2>Movimenti già analizzati</h2><span>4 analisi manuali</span></div>
              <div className="market-data-note"><b>Analisi DS</b><span>Il numero resta a quattro finché un nuovo movimento non viene verificato e analizzato. Le indiscrezioni live sono nel radar editoriale.</span></div>
              {transfers.map((move, index) => <article className="transfer-card" key={move.player}>
                <span className="transfer-index">0{index + 1}</span>
                <div><small>{move.type}</small><h3>{move.player}</h3><p>{move.from} <b>→</b> {move.to}</p></div>
                <div className="impact"><strong>{move.impact}</strong><span>impatto DS</span></div>
                <p className="transfer-note">{move.note}</p>
              </article>)}
            </div>
            <div className="market-sidebar">
              <aside className="market-news-aside">
                <div className="market-news-head"><div><span className="live-dot" /><small>RADAR EDITORIALE</small></div><b>{marketNewsSource === "sosfanta" ? "SOS FANTA" : marketNewsSource === "gnews" ? "GNEWS" : "LIVE"}</b></div>
                <h2>Ultime dal mercato</h2>
                <p className="market-news-intro">Titoli e segnali recenti. Verifica sempre l’articolo originale prima di cambiare strategia d’asta.</p>
                <p className="market-news-refresh"><b>Refresh ogni 10 minuti</b><span>Nessun consumo di crediti AI</span></p>
                <div className="market-news-list">
                  {marketNewsLoading && [1, 2, 3, 4].map((item) => <span className="market-news-skeleton" key={item} />)}
                  {!marketNewsLoading && marketNews.map((item) => <a href={item.url} target="_blank" rel="noopener noreferrer" key={item.url}>
                    <span><time>{newsAge(item.publishedAt)}</time><em>{item.source}</em></span>
                    <strong>{item.title}</strong>
                    {item.description && <p>{item.description}</p>}
                    <i>Leggi la fonte ↗</i>
                  </a>)}
                  {!marketNewsLoading && marketNews.length === 0 && <div className="market-news-empty">Le notizie live non sono disponibili in questo momento.</div>}
                </div>
                <a className="all-market-news" href="https://www.sosfanta.com/calciomercato/" target="_blank" rel="noopener noreferrer">Tutto il mercato su SOS Fanta ↗</a>
              </aside>
              <aside className="market-aside"><span className="live-dot" /> <small>INDICE HYPE · ULTIME 72 ORE</small><h2>Kean guida le conversazioni</h2><p>Il volume editoriale cresce più rapidamente della proiezione bonus. Segnale da prezzo caldo.</p><div className="hype-bars"><span><i style={{ width: "92%" }} />Kean <b>92</b></span><span><i style={{ width: "78%" }} />David <b>78</b></span><span><i style={{ width: "61%" }} />Bonny <b>61</b></span></div><button onClick={() => { setSelectedId(10); setTab("radar"); }}>Analizza il profilo →</button></aside>
            </div>
          </div>
        </section>
      )}

      {tab === "confronta" && (
        <section className="page-section compare-page">
          <div className="page-heading compact"><p className="eyebrow">COMPARATORE DI RUOLO</p><h1>Scelta contro scelta.</h1><p>Confronta fino a tre profili. Le metriche sono normalizzate per ruolo.</p></div>
          <div className="compare-picker">
            <span>Aggiungi un giocatore</span>
            <select aria-label="Aggiungi giocatore al confronto" value="" onChange={e => e.target.value && toggleCompare(Number(e.target.value))}><option value="">Seleziona dal ranking…</option>{radarPlayers.filter(p => !compare.includes(p.id)).map(p => <option value={p.id} key={p.id}>{p.name} · {p.role}</option>)}</select>
          </div>
          <div className="compare-grid">
            {comparedPlayers.map(player => <article className="compare-card" key={player.id}>
              <button className="remove" onClick={() => toggleCompare(player.id)} aria-label={`Rimuovi ${player.name}`}>×</button>
              <PlayerMark player={player} size="large" /><span className="role-chip">{roleLabels[player.role]}</span><h2>{player.name}</h2><p>{player.club} · quota {player.price}</p>
              <div className="compare-score"><strong>{player.score}</strong><span>DS SCORE</span></div>
              {[ ["Gol", player.goals, Math.min(100, player.goals * 6)], ["Assist", player.assists, Math.min(100, player.assists * 10)], ["Forma", player.form, player.form], ["Titolarità", player.starter, player.starter], ["Affidabilità", player.risk === "Basso" ? 92 : player.risk === "Medio" ? 69 : 42, player.risk === "Basso" ? 92 : player.risk === "Medio" ? 69 : 42] ].map(([label, value, percent]) => <div className="compare-metric" key={String(label)}><div><span>{label}</span><b>{value}</b></div><i><em style={{ width: `${percent}%` }} /></i></div>)}
              <div className={`compare-verdict verdict-${player.verdict.toLowerCase()}`}><span>{verdictLabels[player.verdict]}</span><b>Tetto {player.price + (player.verdict === "Compra" ? 2 : 0)} cr</b></div>
            </article>)}
            {comparedPlayers.length < 3 && <div className="compare-empty"><span>+</span><p>Aggiungi un altro profilo per completare il confronto</p></div>}
          </div>
        </section>
      )}

      {tab === "ai" && (
        <section className="page-section ai-page">
          <div className="page-heading ai-heading">
            <div><p className="eyebrow">DIRETTORE SPORTIVO AI</p><h1>Sei leader.<br />Una rosa completa.</h1></div>
            <p>L’AI costruisce tutti i 25 slot: 3 portieri, 8 difensori, 8 centrocampisti e 6 attaccanti. Due leader per reparto, low-cost entro 10 crediti e priorità ai giovani ad alta proiezione.</p>
          </div>

          <div className="ai-control-grid">
            <div className="ai-builder">
              <div className="section-title"><h2>Imposta il piano d’asta</h2><span>ROSA 3 · 8 · 8 · 6</span></div>
              <div className="ai-fields">
                <label><span>Budget lega</span><div className="number-field"><input type="number" value={aiBudget} readOnly aria-label="Budget fisso della lega: 250 crediti" /><b>fisso · crediti</b></div></label>
                <label><span>Modulo preferito</span><select value={aiFormation} onChange={(event) => setAiFormation(event.target.value)}><option>3-4-3</option><option>3-5-2</option><option>4-3-3</option><option>4-4-2</option></select></label>
                <label><span>Profilo di rischio</span><select value={aiRisk} onChange={(event) => setAiRisk(event.target.value)}><option>Prudente</option><option>Equilibrato</option><option>Aggressivo</option></select></label>
              </div>
              <button className="ai-generate" onClick={buildAiPlan} disabled={aiLoading}><span>{aiLoading ? "Analisi di rosa in corso…" : "Genera la rosa bomba"}</span><b>AI →</b></button>
              {aiError && <p className="ai-error">{aiError}</p>}
            </div>
            <aside className="star-rule">
              <div className="star-counter"><strong>{aiPlan?.leadersUsed ?? 0}</strong><span>/ 6</span></div>
              <small>LEADER SELEZIONATI</small>
              <h2>Due colonne<br />per ogni reparto.</h2>
              <p>Il motore sceglie due leader in difesa, due a centrocampo e due in attacco. Tutti gli altri slot restano sotto i 10 crediti.</p>
              <ul><li>6 leader complessivi</li><li>Coppia portieri della stessa squadra</li><li>Aggressivo: tutti i 250 crediti</li></ul>
            </aside>
          </div>

          {aiPlan && (
            <div className="ai-result">
              <div className="result-head">
                <div><span className={`engine-state ${aiSource}`}>{aiSource === "openai" ? "OPENAI LIVE" : "ANTEPRIMA INTELLIGENTE"}</span><h2>{aiPlan.title}</h2><p>{aiPlan.tacticalNote}</p></div>
                <div className="budget-card"><small>SPESA ROSA · {aiPlan.goalkeepers.length + aiPlan.leaders.length + aiPlan.lowCost.length}/25 GIOCATORI</small><strong>{aiPlan.estimatedSpend}</strong><span>su {aiPlan.budget} crediti</span><b>{Math.max(0, aiPlan.budget - aiPlan.estimatedSpend)} residui</b></div>
              </div>
              <div className="full-squad-groups">
                <div className="pick-group goalkeepers"><div className="pick-title"><span>P</span><div><small>PACCHETTO OBBLIGATORIO</small><h3>Tre portieri · titolare e vice abbinati</h3></div></div><div className="goalkeeper-grid">{aiPlan.goalkeepers.map((pick) => <article className="ai-pick" key={pick.player}><span className="role-square">P</span><div><h4>{pick.player}</h4><p>{pick.club} · {pick.reason}</p><small>Rischio {pick.risk}</small></div><div className="max-bid"><strong>{pick.maxBid}</strong><span>tetto</span></div></article>)}</div></div>
                <div className="pick-group leaders"><div className="pick-title"><span>★</span><div><small>6 LEADER COMPLESSIVI</small><h3>Due per ogni reparto</h3></div></div><div className="department-grid">{(["D", "C", "A"] as Role[]).map((department) => <section key={department}><h4>{roleLabels[department]}</h4>{aiPlan.leaders.filter((pick) => pick.role === department).map((pick) => <article className="ai-pick" key={pick.player}><span className="role-square">{pick.role}</span><div><h4>{pick.player}</h4><p>{pick.club} · {pick.reason}</p><small>Rischio {pick.risk}</small></div><div className="max-bid"><strong>{pick.maxBid}</strong><span>tetto</span></div></article>)}</section>)}</div></div>
                <div className="pick-group lowcost"><div className="pick-title"><span>↗</span><div><small>PREDIZIONE E VALORE · MASSIMO 10 CREDITI</small><h3>Low-cost con potenziale futuro</h3></div></div><div className="department-grid">{(["D", "C", "A"] as Role[]).map((department) => <section key={department}><h4>{roleLabels[department]}</h4>{aiPlan.lowCost.filter((pick) => pick.role === department).map((pick) => <article className="ai-pick" key={pick.player}><span className="role-square">{pick.role}</span><div><h4>{pick.player}</h4><p>{pick.club} · {pick.reason}</p><small>Rischio {pick.risk}</small></div><div className="max-bid"><strong>{pick.maxBid}</strong><span>max 10</span></div></article>)}</section>)}</div></div>
              </div>
              <div className="budget-rule"><b>REGOLA DEL DS</b><p>{aiPlan.budgetRule}</p><span>Modulo {aiPlan.formation}</span></div>
            </div>
          )}

          <section className="daily-report">
            <div className="report-top"><div><p className="eyebrow">REPORT GIOVANI · OGNI MATTINA</p><h2>{dailyReport?.headline ?? "Caricamento del briefing…"}</h2></div><span className={reportStored ? "report-live" : "report-demo"}>{reportStored ? "ARCHIVIATO SU SUPABASE" : "PRIMO REPORT DA GENERARE"}</span></div>
            {!reportStored && <div className="report-bootstrap"><div><b>Credito OpenAI attivo</b><span>Genera ora il primo report; dopo continuerà automaticamente una volta al giorno.</span></div><button onClick={generateReportNow} disabled={reportGenerating}>{reportGenerating ? "Analisi in corso…" : "Genera il report AI ora"}</button></div>}
            {reportError && <p className="report-error">{reportError}</p>}
            {dailyReport && <>
              <p className="report-summary">{dailyReport.summary}</p>
              <div className="report-grid">
                <div><h3>Possibili stelle</h3>{dailyReport.prospects.map((prospect) => <article className="prospect-row" key={prospect.player}><span className={`prospect-signal ${prospect.signal.toLowerCase()}`}>{prospect.signal}</span><div><h4>{prospect.player} <small>{prospect.age} · {prospect.club}</small></h4><p>{prospect.reason}</p></div></article>)}</div>
                <div><h3>Radar low-cost</h3>{dailyReport.lowCostWatch.map((pick) => <article className="watch-row" key={pick.player}><span>{pick.role}</span><div><h4>{pick.player}</h4><p>{pick.reason}</p></div></article>)}</div>
                <aside><small>POLSO DEL MERCATO</small><p>{dailyReport.marketPulse}</p><h4>Allarmi del giorno</h4><ul>{dailyReport.alerts.map((alert) => <li key={alert}>{alert}</li>)}</ul><span className="report-date">Aggiornato {new Date(dailyReport.date).toLocaleDateString("it-IT")}</span></aside>
              </div>
            </>}
          </section>
        </section>
      )}

      {tab === "fonti" && (
        <section className="page-section sources-page">
          <div className="page-heading compact"><p className="eyebrow">TRASPARENZA DEL DATO</p><h1>Fonti sotto controllo.</h1><p>L’app non inventa una statistica mancante: mostra copertura, freschezza e affidabilità di ogni segnale.</p></div>
          <div className="source-status"><div><span className="pulse" /><div><strong>{syncMessage}</strong><small>Le stime demo restano disponibili anche offline</small></div></div><button onClick={syncSources} disabled={syncing}>{syncing ? "Sincronizzazione…" : "Verifica connessioni"}</button></div>
          <div className="source-grid">
            <article><div className="source-logo">FD</div><span className={`source-state ${sourceBadge("football-data", "Gratuita").className}`}>{sourceBadge("football-data", "Gratuita").label}</span><h2>football-data.org</h2><p>Calendario, classifiche, rose e risultati. Base affidabile per il contesto squadra.</p><ul><li>10 richieste/min nel piano free</li><li>Token personale richiesto</li><li>Copertura Serie A da verificare per stagione</li></ul></article>
            <article><div className="source-logo">AF</div><span className={`source-state ${sourceBadge("api-football", "Chiave API").className}`}>{sourceBadge("api-football", "Chiave API").label}</span><h2>API-Football</h2><p>Statistiche giocatore, tiri, passaggi, trasferimenti e infortuni quando inclusi nel piano.</p><ul><li>100 richieste/giorno nel piano free</li><li>Stagioni free soggette a limiti</li><li>Fonte primaria del motore statistico</li></ul></article>
            <article><div className="source-logo">GN</div><span className={`source-state ${sourceBadge("gnews", "Chiave API").className}`}>{sourceBadge("gnews", "Chiave API").label}</span><h2>GNews</h2><p>Notizie italiane per misurare attenzione mediatica, sentiment e rischio hype.</p><ul><li>Account gratuito disponibile</li><li>Solo titoli e metadati nel modello</li><li>Mai usata come dato prestazionale</li></ul></article>
            <article><div className="source-logo">SD</div><span className={`source-state ${sourceBadge("thesportsdb", "Pubblica").className}`}>{sourceBadge("thesportsdb", "Pubblica").label}</span><h2>TheSportsDB</h2><p>Squadre, giocatori e metadati di supporto con accesso pubblico al livello base.</p><ul><li>30 richieste/min gratuite</li><li>Chiave pubblica v1 disponibile</li><li>Fallback per anagrafiche e club</li></ul></article>
            <article><div className="source-logo">AI</div><span className={`source-state ${sourceBadge("openai", "Chiave privata").className}`}>{sourceBadge("openai", "Chiave privata").label}</span><h2>OpenAI</h2><p>Ragiona sui segnali disponibili e costruisce la rosa completa con sei leader e low-cost predittivi.</p><ul><li>gpt-5.6-sol per le scelte</li><li>gpt-5.6-luna per il report</li><li>Chiave custodita solo su Vercel</li></ul></article>
            <article><div className="source-logo">SB</div><span className={`source-state ${sourceBadge("supabase", "Piano free").className}`}>{sourceBadge("supabase", "Piano free").label}</span><h2>Supabase</h2><p>Database Postgres esterno per conservare lo storico dei report giornalieri.</p><ul><li>Accesso soltanto lato server</li><li>Row Level Security attiva</li><li>Nessuna chiave esposta al browser</li></ul></article>
          </div>
          <div className="method-note"><span>i</span><div><h3>Come nasce il DS Score</h3><p>Prestazione 40% · titolarità 20% · affidabilità fisica 15% · contesto squadra 15% · prezzo e hype 10%. Regola rosa: 6 leader, due per reparto; gli altri profili di movimento non superano 10 crediti. Età e nazionali Under 18/19 aumentano la proiezione solo quando il segnale è verificabile. La quota ufficiale richiede una licenza del relativo editore: in questa versione è una stima interna dichiarata.</p></div></div>
        </section>
      )}

      <footer><div className="brand footer-brand"><span className="brand-mark">U</span><span><b>UNDICI</b><small>Scouting room</small></span></div><p>Decisioni migliori, non promesse di risultato.</p><span>Serie A 2026/27 · Prototipo operativo</span></footer>
    </main>
  );
}
