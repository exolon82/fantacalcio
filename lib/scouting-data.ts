export type ScoutRole = "P" | "D" | "C" | "A";

export type ScoutPlayer = {
  id: number;
  name: string;
  role: ScoutRole;
  club: string;
  age: number;
  price: number;
  score: number;
  goals: number;
  assists: number;
  shots: number;
  passes: number;
  dribbles: number;
  injuries: number;
  starter: number;
  news: string;
  why: string;
};

// Dataset dimostrativo condiviso dalle route server. Viene sostituito/arricchito
// dai provider live quando le relative chiavi sono configurate su Vercel.
export const scoutPlayers: ScoutPlayer[] = [
  { id: 1, name: "Mile Svilar", role: "P", club: "Roma", age: 26, price: 16, score: 88, goals: 0, assists: 0, shots: 0, passes: 28.6, dribbles: 0, injuries: 0, starter: 96, news: "Gerarchie confermate nel precampionato", why: "Titolarità e continuità con una quota sostenibile." },
  { id: 2, name: "Michele Di Gregorio", role: "P", club: "Juventus", age: 29, price: 14, score: 82, goals: 0, assists: 0, shots: 0, passes: 31.2, dribbles: 0, injuries: 1, starter: 91, news: "Concorrenza interna sotto osservazione", why: "Profilo regolare da prendere senza rilanci." },
  { id: 3, name: "Federico Dimarco", role: "D", club: "Inter", age: 28, price: 24, score: 91, goals: 4, assists: 9, shots: 1.48, passes: 42.7, dribbles: 1.1, injuries: 2, starter: 88, news: "Centrale nel nuovo assetto offensivo", why: "Produzione offensiva da centrocampista." },
  { id: 4, name: "Alessandro Bastoni", role: "D", club: "Inter", age: 27, price: 17, score: 85, goals: 1, assists: 6, shots: 0.51, passes: 64.8, dribbles: 0.6, injuries: 1, starter: 94, news: "Leadership tecnica in crescita", why: "Minuti, costruzione e assist a un prezzo controllabile." },
  { id: 5, name: "Giovanni Di Lorenzo", role: "D", club: "Napoli", age: 33, price: 13, score: 78, goals: 3, assists: 4, shots: 0.72, passes: 48.1, dribbles: 0.7, injuries: 0, starter: 92, news: "Quota in raffreddamento: possibile affare", why: "Titolarità e copertura con costo da low-cost." },
  { id: 6, name: "Scott McTominay", role: "C", club: "Napoli", age: 29, price: 31, score: 93, goals: 12, assists: 6, shots: 2.31, passes: 37.4, dribbles: 1, injuries: 0, starter: 95, news: "Hype alto, fondamentali ancora solidi", why: "Inserimenti e continuità da attaccante aggiunto." },
  { id: 7, name: "Christian Pulisic", role: "C", club: "Milan", age: 27, price: 29, score: 89, goals: 11, assists: 8, shots: 2.02, passes: 34.5, dribbles: 1.7, injuries: 2, starter: 90, news: "Provato vicino alla porta", why: "Bonus da attaccante con classificazione a centrocampo." },
  { id: 8, name: "Riccardo Orsolini", role: "C", club: "Bologna", age: 29, price: 23, score: 83, goals: 10, assists: 4, shots: 2.18, passes: 25.6, dribbles: 1.5, injuries: 1, starter: 87, news: "Mercato silenzioso, prezzo più razionale", why: "Volume di tiro e bonus sopra la media." },
  { id: 9, name: "Lautaro Martínez", role: "A", club: "Inter", age: 28, price: 47, score: 94, goals: 21, assists: 7, shots: 3.42, passes: 24.8, dribbles: 1.2, injuries: 1, starter: 94, news: "Consenso alto, nessun segnale d’allarme", why: "Volume di tiro e ruolo centrale nel reparto." },
  { id: 10, name: "Moise Kean", role: "A", club: "Fiorentina", age: 26, price: 39, score: 88, goals: 19, assists: 3, shots: 3.05, passes: 17.9, dribbles: 1.3, injuries: 2, starter: 96, news: "Il nome più battuto nelle leghe private", why: "Numeri da leader, ma prezzo già carico di hype." },
  { id: 11, name: "Artem Dovbyk", role: "A", club: "Roma", age: 29, price: 30, score: 80, goals: 13, assists: 3, shots: 2.44, passes: 18.3, dribbles: 0.6, injuries: 3, starter: 82, news: "Fiducia divisa: occasione se scende", why: "Possibile rilancio se la quota resta corretta." },
  { id: 12, name: "Ange-Yoan Bonny", role: "A", club: "Inter", age: 22, price: 18, score: 79, goals: 8, assists: 4, shots: 1.94, passes: 16.4, dribbles: 1.8, injuries: 1, starter: 61, news: "Hype da trasferimento sopra i minuti attesi", why: "Giovane ad alto upside, da pagare come scommessa." },
];

export function isStar(player: ScoutPlayer) {
  return player.price >= 35 || player.score >= 92;
}

