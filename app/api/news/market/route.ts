import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type MarketNewsItem = {
  title: string;
  url: string;
  publishedAt: string;
  description: string;
  source: string;
};

const SOS_FANTA_FEED = "https://www.sosfanta.com/feed/";
const SOS_FANTA_API = "https://www.sosfanta.com/wp-json/wp/v2/posts?per_page=12&_fields=link,date,title,excerpt";

function decodeEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

function textOnly(value: string) {
  return decodeEntities(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function readTag(block: string, tag: string) {
  const escaped = tag.replace(":", "\\:");
  const match = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match ? textOnly(match[1]) : "";
}

function parseSosFanta(xml: string): MarketNewsItem[] {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  const parsed = blocks.flatMap((block) => {
    const title = readTag(block, "title");
    const url = readTag(block, "link");
    if (!title || !url.startsWith("https://www.sosfanta.com/")) return [];
    const categories = [...block.matchAll(/<category(?:\s[^>]*)?>([\s\S]*?)<\/category>/gi)].map((match) => textOnly(match[1]));
    const description = readTag(block, "description");
    const isMarket = categories.some((category) => category.toLocaleLowerCase("it") === "mercato");
    const marketWords = /mercato|ufficiale|romano|moretto|here we go|trattativ|accordo|offerta|cessione|lascia|vicin|chiusura|firma/i;
    return [{ title, url, publishedAt: readTag(block, "pubDate"), description: description.slice(0, 190), source: "SOS Fanta", isMarket: isMarket || marketWords.test(`${title} ${description}`) }];
  });
  return parsed.filter((item) => item.isMarket).slice(0, 6).map((item) => ({
    title: item.title,
    url: item.url,
    publishedAt: item.publishedAt,
    description: item.description,
    source: item.source,
  }));
}

async function fetchSosFantaApi(): Promise<MarketNewsItem[]> {
  const response = await fetch(SOS_FANTA_API, {
    headers: { Accept: "application/json", "User-Agent": "UNDICI Fantacalcio Scout/1.0" },
    next: { revalidate: 600 },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) return [];
  const posts = (await response.json()) as Array<{
    link?: string;
    date?: string;
    title?: { rendered?: string };
    excerpt?: { rendered?: string };
  }>;
  return posts.flatMap((post) => {
    const title = textOnly(post.title?.rendered ?? "");
    const url = post.link ?? "";
    if (!title || !url.startsWith("https://www.sosfanta.com/")) return [];
    return [{
      title,
      url,
      publishedAt: post.date ?? "",
      description: textOnly(post.excerpt?.rendered ?? "").slice(0, 190),
      source: "SOS Fanta",
    }];
  }).slice(0, 6);
}

async function fetchGNewsFallback(): Promise<MarketNewsItem[]> {
  const key = process.env.GNEWS_API_KEY;
  if (!key) return [];
  const query = encodeURIComponent("Serie A (calciomercato OR trasferimento OR ufficiale OR trattativa)");
  const response = await fetch(`https://gnews.io/api/v4/search?q=${query}&lang=it&country=it&max=8&sortby=publishedAt&apikey=${encodeURIComponent(key)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { articles?: Array<{ title?: string; url?: string; publishedAt?: string; description?: string; source?: { name?: string } }> };
  return (payload.articles ?? []).flatMap((article) => article.title && article.url ? [{
    title: article.title,
    url: article.url,
    publishedAt: article.publishedAt ?? "",
    description: (article.description ?? "").slice(0, 190),
    source: article.source?.name ?? "GNews",
  }] : []).slice(0, 6);
}

export async function GET() {
  try {
    const news = await fetchSosFantaApi();
    if (news.length) return NextResponse.json({ news, source: "sosfanta", updatedAt: new Date().toISOString() });
  } catch { /* Il feed RSS resta la seconda via di accesso a SOS Fanta. */ }

  try {
    const response = await fetch(SOS_FANTA_FEED, {
      headers: { Accept: "application/rss+xml, application/xml;q=0.9", "User-Agent": "UNDICI Fantacalcio Scout/1.0" },
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(12000),
    });
    if (response.ok) {
      const news = parseSosFanta(await response.text());
      if (news.length) return NextResponse.json({ news, source: "sosfanta", updatedAt: new Date().toISOString() });
    }
  } catch { /* GNews è il fallback autorizzato quando il feed non risponde. */ }

  try {
    const news = await fetchGNewsFallback();
    return NextResponse.json({ news, source: news.length ? "gnews" : "unavailable", updatedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ news: [], source: "unavailable", updatedAt: new Date().toISOString() });
  }
}
