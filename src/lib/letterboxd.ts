import "server-only";

/**
 * Letterboxd "Popular this week" scraper — fetch + regex, no extra deps.
 *
 * Letterboxd server-renders everything we need: /lists/ carries a
 * `<section id="popular-lists">` with anchors to each trending list, and list
 * pages carry `data-item-full-display-name="Jaws (1975)"` per film. The
 * fetchers NEVER throw — any failure (403 from a datacenter IP, timeout,
 * markup change) yields `degraded: true` so callers can keep last week's
 * data instead of wiping it.
 */

const LETTERBOXD_ORIGIN = "https://letterboxd.com";
const FETCH_TIMEOUT_MS = 6000;

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};

export type LetterboxdListRef = {
  /** Path segment of the curator, e.g. "fcbarcelona". */
  user: string;
  /** Path segment of the list, e.g. "movies-everyone-should-watch". */
  listSlug: string;
  /** Display name from the title anchor, or derived from the slug. */
  name: string;
  /** Absolute URL of the list. */
  url: string;
};

export type ScrapedFilm = { name: string; year: number | null };

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function nameFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Parse the "Popular this week" list links out of the /lists/ page. Pure, no
 * I/O. Each list appears twice (poster-stack anchor with no text + a title
 * anchor); we dedupe by user/slug and prefer the anchor with readable text.
 */
export function parsePopularLists(html: string): LetterboxdListRef[] {
  const start = html.indexOf('id="popular-lists"');
  if (start === -1) return [];
  const end = html.indexOf('<section id="', start);
  const section = html.slice(start, end === -1 ? html.length : end);

  const byKey = new Map<string, LetterboxdListRef>();
  const anchorRe =
    /<a\s[^>]*href="\/([A-Za-z0-9_.-]+)\/list\/([a-z0-9-]+)\/"[^>]*>([\s\S]*?)<\/a>/g;
  for (const m of section.matchAll(anchorRe)) {
    const [, user, listSlug, inner] = m;
    const text = decodeEntities(inner.replace(/<[^>]+>/g, "").replace(/\s+/g, " "));
    const key = `${user}/${listSlug}`;
    const existing = byKey.get(key);
    if (existing && existing.name) continue;
    byKey.set(key, {
      user,
      listSlug,
      name: text || existing?.name || "",
      url: `${LETTERBOXD_ORIGIN}/${user}/list/${listSlug}/`,
    });
  }

  return Array.from(byKey.values(), (ref) => ({
    ...ref,
    name: ref.name || nameFromSlug(ref.listSlug),
  }));
}

/**
 * Parse the films on a list page. Pure, no I/O. Titles arrive as
 * `data-item-full-display-name="Title (1975)"`; the year regex is anchored at
 * the end so titles containing parentheses stay intact.
 */
export function parseListFilms(html: string): ScrapedFilm[] {
  const films: ScrapedFilm[] = [];
  for (const m of html.matchAll(/data-item-full-display-name="([^"]*)"/g)) {
    const display = decodeEntities(m[1]);
    if (!display) continue;
    const withYear = display.match(/^(.*?)\s*\((\d{4})\)\s*$/);
    films.push(
      withYear
        ? { name: withYear[1].trim() || display, year: Number.parseInt(withYear[2], 10) }
        : { name: display, year: null },
    );
  }
  return films;
}

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Fetch + parse the trending lists. Best-effort, never throws. */
export async function fetchPopularLists(
  limit: number,
): Promise<{ lists: LetterboxdListRef[]; degraded: boolean }> {
  const html = await fetchHtml(`${LETTERBOXD_ORIGIN}/lists/`);
  if (!html) return { lists: [], degraded: true };
  const lists = parsePopularLists(html);
  if (lists.length === 0) return { lists: [], degraded: true };
  return { lists: lists.slice(0, limit), degraded: false };
}

/** Fetch + parse one list's films (first page only). Never throws. */
export async function fetchListFilms(
  ref: LetterboxdListRef,
): Promise<{ films: ScrapedFilm[]; degraded: boolean }> {
  const html = await fetchHtml(ref.url);
  if (!html) return { films: [], degraded: true };
  const films = parseListFilms(html);
  if (films.length === 0) return { films: [], degraded: true };
  return { films, degraded: false };
}
