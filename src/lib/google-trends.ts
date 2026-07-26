import "server-only";

/**
 * Google Trends "Daily Search Trends" public RSS — free, no API key. We parse
 * the XML ourselves.
 *
 * Reality check: from a datacenter IP (Vercel/AWS/GCP) Google intermittently
 * returns 403/429/consent redirects. The User-Agent is NOT the gate (it works
 * from residential IPs under any UA) — IP reputation is. So a browser-like UA
 * is a harmless hedge; the real safeguard is that this NEVER throws and callers
 * fall back. Any failure → `{ terms: [], degraded: true }`.
 */

// The old /trends/trendingsearches/daily/rss path now 404s — Google moved the
// feed to /trending/rss (same RSS shape, same ht: namespace).
const TRENDS_RSS = "https://trends.google.com/trending/rss";

export type TrendTerm = { query: string; approxTraffic: string | null };
export type TrendsResult = { terms: TrendTerm[]; degraded: boolean };

function stripCdata(s: string): string {
  return s
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/** Parse the RSS XML into trending query terms. Pure, no I/O. */
export function parseTrendsRss(xml: string): TrendTerm[] {
  const terms: TrendTerm[] = [];
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  for (const item of items) {
    const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
    if (!titleMatch) continue;
    const query = stripCdata(titleMatch[1]);
    if (!query) continue;
    const trafficMatch = item.match(
      /<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/,
    );
    terms.push({
      query,
      approxTraffic: trafficMatch ? stripCdata(trafficMatch[1]) : null,
    });
  }
  return terms;
}

/**
 * Fetch + parse the daily trends for a region. Best-effort: returns
 * `degraded: true` (and no terms) on any failure, never throws.
 */
export async function getDailyTrends(geo = "US"): Promise<TrendsResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${TRENDS_RSS}?geo=${encodeURIComponent(geo)}`, {
      signal: controller.signal,
      headers: {
        // Harmless hedge — not what actually gates access.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      // Cache successes so a flaky success rate still yields a full feature.
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { terms: [], degraded: true };
    const xml = await res.text();
    // A consent-page/redirect body won't contain <item> — parse yields nothing.
    const terms = parseTrendsRss(xml);
    if (terms.length === 0) return { terms: [], degraded: true };
    return { terms, degraded: false };
  } catch {
    return { terms: [], degraded: true };
  } finally {
    clearTimeout(timeout);
  }
}
