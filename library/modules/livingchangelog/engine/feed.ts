/** Zero-dependency Atom + JSON Feed renderers for public changelog syndication. */
import type { LivingChangelogConfig } from "./config.ts";
import { correctionDiary } from "./corrector.ts";
import { renderMarkdown } from "./markdown.ts";
import type { ChangelogEntry } from "./ports.ts";

const xml = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const baseUrl = (cfg: LivingChangelogConfig) => cfg.site.url.replace(/\/+$/, "");
const changelogUrl = (cfg: LivingChangelogConfig) => `${baseUrl(cfg)}${cfg.site.changelogPath}`;
const entryUrl = (cfg: LivingChangelogConfig, e: Pick<ChangelogEntry, "slug">) => `${changelogUrl(cfg).replace(/\/+$/, "")}/${encodeURIComponent(e.slug)}`;
const modifiedAt = (e: ChangelogEntry) => e.corrections?.at?.(-1)?.at ?? e.published_at;
/** Full entry HTML, correction notes included, so feed readers see amendments too. */
const entryHtml = (e: ChangelogEntry) => renderMarkdown(`${e.body}${correctionDiary(e)}`);

export function renderAtom(entries: ChangelogEntry[], cfg: LivingChangelogConfig, limit = 50): string {
  const rows = entries.slice(0, Math.max(1, Math.min(200, Math.floor(limit))));
  const home = changelogUrl(cfg);
  const feed = `${home.replace(/\/+$/, "")}/atom.xml`;
  const updated = rows.length ? rows.map(modifiedAt).sort().at(-1)! : new Date(0).toISOString();
  const items = rows.map((e) => `  <entry>\n    <title>${xml(e.title)}</title>\n    <id>${xml(entryUrl(cfg, e))}</id>\n    <link href="${xml(entryUrl(cfg, e))}"/>\n    <published>${xml(e.published_at)}</published>\n    <updated>${xml(modifiedAt(e))}</updated>\n    <summary>${xml(e.excerpt)}</summary>\n    <content type="html">${xml(entryHtml(e))}</content>\n${e.categories.map((c) => `    <category term="${xml(c)}"/>`).join("\n")}\n  </entry>`).join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n  <title>${xml(cfg.site.changelogName)}</title>\n  <subtitle>${xml(cfg.site.tagline)}</subtitle>\n  <id>${xml(home)}</id>\n  <link href="${xml(home)}"/>\n  <link href="${xml(feed)}" rel="self" type="application/atom+xml"/>\n  <updated>${xml(updated)}</updated>\n  <author><name>${xml(cfg.site.name)}</name></author>\n${items}\n</feed>\n`;
}

export function renderJsonFeed(entries: ChangelogEntry[], cfg: LivingChangelogConfig, limit = 50): string {
  const rows = entries.slice(0, Math.max(1, Math.min(200, Math.floor(limit))));
  const home = changelogUrl(cfg);
  return JSON.stringify({
    version: "https://jsonfeed.org/version/1.1",
    title: cfg.site.changelogName,
    description: cfg.site.tagline,
    home_page_url: home,
    feed_url: `${home.replace(/\/+$/, "")}/feed.json`,
    authors: [{ name: cfg.site.name, url: baseUrl(cfg) }],
    items: rows.map((e) => ({
      id: entryUrl(cfg, e),
      url: entryUrl(cfg, e),
      title: e.title,
      content_html: entryHtml(e),
      content_text: `${e.body}${correctionDiary(e)}`,
      summary: e.excerpt,
      date_published: e.published_at,
      date_modified: modifiedAt(e),
      tags: e.categories,
    })),
  }, null, 2);
}
