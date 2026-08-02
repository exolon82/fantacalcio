# Undici — Fantacalcio Scouting Room

Dashboard di scouting per il Fantacalcio Serie A 2026/27: radar d'asta,
comparatore per ruolo, shortlist, trasferimenti e valutazione dell'hype.

## Avvio locale

Richiede Node.js 24.

```bash
npm ci
npm run dev
```

Apri `http://localhost:3000`.

## Dati live opzionali

Copia `.env.example` in `.env.local` e inserisci soltanto le chiavi che vuoi
usare:

- `API_FOOTBALL_KEY`
- `FOOTBALL_DATA_KEY`
- `GNEWS_API_KEY`

Senza chiavi l'app continua a funzionare con il dataset dimostrativo dichiarato.

## Pubblicazione

Il progetto è configurato per Vercel. Ogni push sul ramo `main` genera un nuovo
deployment di produzione.
