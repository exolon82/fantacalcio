"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "P" | "D" | "C" | "A";
type Tab = "radar" | "mercato" | "confronta" | "fonti";

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

export default function Home() {
  const [tab, setTab] = useState<Tab>("radar");
  const [role, setRole] = useState<Role | "Tutti">("Tutti");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(6);
  const [shortlist, setShortlist] = useState<number[]>([]);
  const [compare, setCompare] = useState<number[]>([6, 7]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("Pronto per la sincronizzazione");

  useEffect(() => {
    const saved = window.localStorage.getItem("undici-shortlist");
    if (saved) setShortlist(JSON.parse(saved));
  }, []);

  useEffect(() => {
    window.localStorage.setItem("undici-shortlist", JSON.stringify(shortlist));
  }, [shortlist]);

  const filtered = useMemo(() => players
    .filter(p => role === "Tutti" || p.role === role)
    .filter(p => `${p.name} ${p.club}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.score - a.score), [role, query]);

  const selected = players.find(p => p.id === selectedId) ?? players[0];
  const comparedPlayers = compare.map(id => players.find(p => p.id === id)).filter(Boolean) as Player[];

  function toggleShortlist(id: number) {
    setShortlist(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }

  function toggleCompare(id: number) {
    setCompare(current => current.includes(id) ? current.filter(item => item !== id) : current.length < 3 ? [...current, id] : [current[1], current[2], id]);
  }

  async function syncSources() {
    setSyncing(true);
    setSyncMessage("Controllo delle fonti in corso…");
    try {
      const response = await fetch("/api/sync", { cache: "no-store" });
      const data = await response.json() as { providers: { live: boolean }[]; checkedAt: string };
      const live = data.providers.filter((provider: { live: boolean }) => provider.live).length;
      setSyncMessage(`${live}/${data.providers.length} fonti raggiungibili · ${new Date(data.checkedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`);
    } catch {
      setSyncMessage("Connessione non disponibile: dati demo preservati");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <main>
      <div className="data-banner">SCENARIO PRE-ASTA 2026/27 <span>•</span> Dati dimostrativi, non quotazioni ufficiali</div>
      <header className="topbar">
        <button className="brand" onClick={() => setTab("radar")} aria-label="Vai alla home">
          <span className="brand-mark">U</span>
          <span><b>UNDICI</b><small>Scouting room</small></span>
        </button>
        <nav aria-label="Navigazione principale">
          <button className={tab === "radar" ? "active" : ""} onClick={() => setTab("radar")}>Radar asta</button>
          <button className={tab === "mercato" ? "active" : ""} onClick={() => setTab("mercato")}>Trasferimenti</button>
          <button className={tab === "confronta" ? "active" : ""} onClick={() => setTab("confronta")}>Confronta <span className="nav-count">{compare.length}</span></button>
          <button className={tab === "fonti" ? "active" : ""} onClick={() => setTab("fonti")}>Fonti</button>
        </nav>
        <div className="header-actions">
          <button className="shortlist-button" onClick={() => { setRole("Tutti"); setQuery(""); setTab("radar"); }}><span>☆</span> Shortlist <b>{shortlist.length}</b></button>
          <button className="avatar" aria-label="Profilo direttore sportivo">DS</button>
        </div>
      </header>

      {tab === "radar" && (
        <>
          <section className="hero">
            <div>
              <p className="eyebrow">SERIE A · STAGIONE 2026/27</p>
              <h1>Il tuo vantaggio<br />prima dell’asta.</h1>
              <p className="hero-copy">Numeri, contesto e giudizio tecnico in un’unica decisione. Nessun nome comprato solo per sentito dire.</p>
            </div>
            <div className="hero-summary">
              <div className="summary-top"><span>Radar opportunità</span><small>MODELLO DS v1.0</small></div>
              <strong>7</strong><span className="summary-label">profili sotto quota</span>
              <div className="summary-meter"><i style={{ width: "68%" }} /></div>
              <div className="summary-bottom"><span>+3 dall’ultimo check</span><button onClick={() => setTab("mercato")}>Apri mercato →</button></div>
            </div>
          </section>

          <section className="workspace">
            <div className="board">
              <div className="board-head">
                <div><p className="section-kicker">SHORTLIST INTELLIGENTE</p><h2>Giocatori da tavolo</h2></div>
                <label className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cerca giocatore o club" aria-label="Cerca giocatore o club" /></label>
              </div>
              <div className="role-filters" aria-label="Filtra per ruolo">
                {(["Tutti", "P", "D", "C", "A"] as const).map(item => <button key={item} onClick={() => setRole(item)} className={role === item ? "active" : ""}>{item === "Tutti" ? "Tutti" : roleLabels[item]}<span>{item === "Tutti" ? players.length : players.filter(p => p.role === item).length}</span></button>)}
              </div>
              <div className="table-labels"><span>Giocatore</span><span>Forma</span><span>Quota</span><span>DS score</span><span>Decisione</span><span /></div>
              <div className="player-list">
                {filtered.map(player => (
                  <article key={player.id} className={`player-row ${selected.id === player.id ? "selected" : ""}`} onClick={() => setSelectedId(player.id)}>
                    <div className="player-cell"><PlayerMark player={player} /><div><strong>{player.name}</strong><small><b>{player.role}</b> {player.club} · {player.age} anni</small></div></div>
                    <MiniTrend values={player.trend} />
                    <div className="price"><strong>{player.price}</strong><small>crediti</small></div>
                    <div className="score"><strong>{player.score}</strong><span>/100</span></div>
                    <span className={`verdict verdict-${player.verdict.toLowerCase()}`}>{verdictLabels[player.verdict]}</span>
                    <div className="row-actions">
                      <button className={compare.includes(player.id) ? "on" : ""} onClick={e => { e.stopPropagation(); toggleCompare(player.id); }} aria-label={`Confronta ${player.name}`}>⇄</button>
                      <button className={shortlist.includes(player.id) ? "saved" : ""} onClick={e => { e.stopPropagation(); toggleShortlist(player.id); }} aria-label={`Salva ${player.name}`}>{shortlist.includes(player.id) ? "★" : "☆"}</button>
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
                <button className={shortlist.includes(selected.id) ? "detail-save saved" : "detail-save"} onClick={() => toggleShortlist(selected.id)}>{shortlist.includes(selected.id) ? "★" : "☆"}</button>
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

      {tab === "mercato" && (
        <section className="page-section">
          <div className="page-heading"><p className="eyebrow">MARKET INTELLIGENCE</p><h1>Il mercato cambia<br />le gerarchie.</h1><p>Ogni trasferimento viene tradotto in impatto fantacalcistico: titolarità, ruolo, concorrenza e prezzo.</p></div>
          <div className="market-layout">
            <div className="transfer-list">
              <div className="section-title"><h2>Ultimi movimenti monitorati</h2><span>4 aggiornamenti</span></div>
              {transfers.map((move, index) => <article className="transfer-card" key={move.player}>
                <span className="transfer-index">0{index + 1}</span>
                <div><small>{move.type}</small><h3>{move.player}</h3><p>{move.from} <b>→</b> {move.to}</p></div>
                <div className="impact"><strong>{move.impact}</strong><span>impatto DS</span></div>
                <p className="transfer-note">{move.note}</p>
              </article>)}
            </div>
            <aside className="market-aside"><span className="live-dot" /> <small>INDICE HYPE · ULTIME 72 ORE</small><h2>Kean guida le conversazioni</h2><p>Il volume editoriale cresce più rapidamente della proiezione bonus. Segnale da prezzo caldo.</p><div className="hype-bars"><span><i style={{ width: "92%" }} />Kean <b>92</b></span><span><i style={{ width: "78%" }} />David <b>78</b></span><span><i style={{ width: "61%" }} />Bonny <b>61</b></span></div><button onClick={() => { setSelectedId(10); setTab("radar"); }}>Analizza il profilo →</button></aside>
          </div>
        </section>
      )}

      {tab === "confronta" && (
        <section className="page-section compare-page">
          <div className="page-heading compact"><p className="eyebrow">COMPARATORE DI RUOLO</p><h1>Scelta contro scelta.</h1><p>Confronta fino a tre profili. Le metriche sono normalizzate per ruolo.</p></div>
          <div className="compare-picker">
            <span>Aggiungi un giocatore</span>
            <select aria-label="Aggiungi giocatore al confronto" value="" onChange={e => e.target.value && toggleCompare(Number(e.target.value))}><option value="">Seleziona dalla rosa…</option>{players.filter(p => !compare.includes(p.id)).map(p => <option value={p.id} key={p.id}>{p.name} · {p.role}</option>)}</select>
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

      {tab === "fonti" && (
        <section className="page-section sources-page">
          <div className="page-heading compact"><p className="eyebrow">TRASPARENZA DEL DATO</p><h1>Fonti sotto controllo.</h1><p>L’app non inventa una statistica mancante: mostra copertura, freschezza e affidabilità di ogni segnale.</p></div>
          <div className="source-status"><div><span className="pulse" /><div><strong>{syncMessage}</strong><small>Le stime demo restano disponibili anche offline</small></div></div><button onClick={syncSources} disabled={syncing}>{syncing ? "Sincronizzazione…" : "Verifica connessioni"}</button></div>
          <div className="source-grid">
            <article><div className="source-logo">FD</div><span className="source-state ready">Gratuita</span><h2>football-data.org</h2><p>Calendario, classifiche, rose e risultati. Base affidabile per il contesto squadra.</p><ul><li>10 richieste/min nel piano free</li><li>Token personale richiesto</li><li>Copertura Serie A da verificare per stagione</li></ul></article>
            <article><div className="source-logo">AF</div><span className="source-state key">Chiave API</span><h2>API-Football</h2><p>Statistiche giocatore, tiri, passaggi, trasferimenti e infortuni quando inclusi nel piano.</p><ul><li>100 richieste/giorno nel piano free</li><li>Stagioni free soggette a limiti</li><li>Fonte primaria del motore statistico</li></ul></article>
            <article><div className="source-logo">GN</div><span className="source-state key">Chiave API</span><h2>GNews</h2><p>Notizie italiane per misurare attenzione mediatica, sentiment e rischio hype.</p><ul><li>Account gratuito disponibile</li><li>Solo titoli e metadati nel modello</li><li>Mai usata come dato prestazionale</li></ul></article>
            <article><div className="source-logo">SD</div><span className="source-state ready">Demo attiva</span><h2>TheSportsDB</h2><p>Squadre, giocatori e metadati di supporto con accesso pubblico al livello base.</p><ul><li>30 richieste/min gratuite</li><li>Chiave pubblica v1 disponibile</li><li>Fallback per anagrafiche e club</li></ul></article>
          </div>
          <div className="method-note"><span>i</span><div><h3>Come nasce il DS Score</h3><p>Prestazione 40% · titolarità 20% · affidabilità fisica 15% · contesto squadra 15% · prezzo e hype 10%. La quota fantacalcistica ufficiale richiede una licenza del relativo editore: in questa versione è una stima interna dichiarata.</p></div></div>
        </section>
      )}

      <footer><div className="brand footer-brand"><span className="brand-mark">U</span><span><b>UNDICI</b><small>Scouting room</small></span></div><p>Decisioni migliori, non promesse di risultato.</p><span>Serie A 2026/27 · Prototipo operativo</span></footer>
    </main>
  );
}
