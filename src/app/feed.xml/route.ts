import { getAllPosts, getAllLists } from "@/lib/content";
import { SITE_URL, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const revalidate = 3600;

function escapeCdata(s: string): string {
  return s.replace(/]]>/g, "]]]]><![CDATA[>");
}

export async function GET() {
  const [posts, lists] = await Promise.all([getAllPosts(), getAllLists()]);
  const entries = [...posts, ...lists]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 50);

  const items = entries
    .map((e) => {
      const seg = e.kind === "post" ? "blog" : "lists";
      const link = `${SITE_URL}/${seg}/${e.slug}`;
      return `<item>
      <title><![CDATA[${escapeCdata(e.title)}]]></title>
      <link>${link}</link>
      <guid>${link}</guid>
      <description><![CDATA[${escapeCdata(e.description)}]]></description>
      <pubDate>${new Date(e.publishedAt).toUTCString()}</pubDate>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>${SITE_NAME}</title>
  <link>${SITE_URL}</link>
  <description>${SITE_TAGLINE}</description>
  ${items}
</channel></rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
