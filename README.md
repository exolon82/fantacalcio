# Undici — Fantacalcio Scouting Room

Dashboard di scouting per il Fantacalcio Serie A 2026/27: radar d'asta,
comparatore per ruolo, shortlist, trasferimenti, Direttore Sportivo AI e report
giornaliero sui giovani. La strategia sceglie due leader per difesa, centrocampo e attacco e completa
la rosa con profili low-cost.

## Avvio locale

Richiede Node.js 24.

```bash
npm ci
npm run dev
```

Apri `http://localhost:3000`.

## Dati live

Copia `.env.example` in `.env.local` e inserisci soltanto le chiavi che vuoi
usare:

- `API_FOOTBALL_KEY`
- `SERIE_A_SEASON` (opzionale, predefinito `2026`)
- `FOOTBALL_DATA_KEY`
- `GNEWS_API_KEY`
- `OPENAI_API_KEY`
- `OPENAI_SCOUT_MODEL` (predefinito `gpt-5.6-sol`)
- `OPENAI_REPORT_MODEL` (predefinito `gpt-5.6-luna`)
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `CRON_SECRET`

Senza chiavi l'app continua a funzionare con il dataset e con il piano d'asta
dimostrativi dichiarati. Le chiavi devono essere inserite tra le variabili
d'ambiente Vercel e non devono mai essere inviate al browser.

## Database, rosa Serie A e report quotidiano

1. Crea un progetto Supabase gratuito.
2. Esegui `supabase/migrations/001_daily_reports.sql` nel SQL Editor.
3. Esegui `supabase/migrations/002_serie_a_players.sql` nello stesso SQL Editor.
4. Inserisci URL e secret key del progetto nelle variabili Vercel.
5. Imposta un `CRON_SECRET` casuale di almeno 16 caratteri.

Vercel sincronizza ogni giorno rose, statistiche dell'ultima stagione e
infortuni tramite API-Football. Alle 06:00 UTC crea inoltre il report AI sui
giovani. La scrittura del report è idempotente: per ogni data viene conservato
un solo report.

La pagina **Serie A** mostra l'intero archivio sincronizzato, permette di
filtrare Under 21/23/25, ruolo e squadra e distingue sempre tra **stima UNDICI**
e quotazione ufficiale. La colonna della quotazione ufficiale resta vuota finché
non viene importato un listone autorizzato: API-Football fornisce rendimento e
rose, ma non le quotazioni proprietarie di Fantacalcio.it.

Nota: Supabase, GNews e alcuni provider sportivi offrono piani gratuiti; l'uso
dell'API OpenAI richiede invece un account API con credito disponibile.

## Pubblicazione

Il progetto è configurato per Vercel. Ogni push sul ramo `main` genera un nuovo
deployment di produzione.
