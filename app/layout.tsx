import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:3000";
  const protocol = incoming.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;

  return {
    title: "Undici — Scouting room per il Fantacalcio",
    description: "Analisi, confronto e decisioni d'asta per il Fantacalcio Serie A 2026/27.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Undici — Il tuo vantaggio prima dell’asta",
      description: "Scouting room per il Fantacalcio Serie A 2026/27.",
      images: [{ url: image, width: 1737, height: 909, alt: "Undici Scouting Room" }],
      locale: "it_IT",
      type: "website",
    },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it"><body>{children}</body></html>;
}
