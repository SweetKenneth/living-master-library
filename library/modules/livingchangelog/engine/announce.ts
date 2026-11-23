/**
 * Announcements: tell Bluesky, Mastodon, X, Discord, Slack (or any webhook)
 * when an entry publishes.
 *
 * No model is involved. The post is assembled from the entry's own title and
 * excerpt, which already passed the immune gate, the Skeptic and shipping
 * proof, so an announcement can never claim more than the changelog does.
 *
 * Delivery goes through an outbox in state: the text is fixed when the entry
 * publishes, each tick sends what is due, failures retry with backoff, and a
 * sent post is never sent again.
 */

import type { LivingChangelogConfig } from "./config.ts";
import { blocks, screen } from "./immune.ts";
import type { Announcement, Announcer, ChangelogEntry, Storage } from "./ports.ts";

export const DEFAULT_TEMPLATE = "{title}: {excerpt}";
const OUTBOX = "announce.outbox";
const MAX_ATTEMPTS = 5;
const KEEP_DAYS = 30;

export type OutboxItem = {
  key: string; entry_id: string; entry_slug: string; channel: string; text: string; url: string;
  title: string; excerpt: string; version: string | null;
  status: "pending" | "sent" | "failed"; attempts: number; enqueued_at: string; not_before: string;
  sent_at?: string; post_url?: string | null; last_error?: string;
};

const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
/** Length as people (and Bluesky) count it: one emoji or accented letter is one character. */
export const graphemes = (s: string): number => segmenter ? [...segmenter.segment(s)].length : [...s].length;
const sliceGraphemes = (s: string, n: number): string => segmenter ? [...segmenter.segment(s)].slice(0, n).map((x) => x.segment).join("") : [...s].slice(0, n).join("");

/** Cut at a word boundary and mark the cut. Returns "" if nothing sensible fits. */
function fit(s: string, max: number): string {
  if (graphemes(s) <= max) return s;
  if (max < 2) return "";
  const cut = sliceGraphemes(s, max - 1);
  const atWord = cut.replace(/\s+\S*$/, "");
  return `${(atWord.length >= cut.length * 0.6 ? atWord : cut).replace(/[\s,;:.\-]+$/, "")}…`;
}

export const entryUrl = (cfg: LivingChangelogConfig, slug: string) =>
  `${cfg.site.url.replace(/\/+$/, "")}${cfg.site.changelogPath.replace(/\/+$/, "")}/${encodeURIComponent(slug)}`;

/**
 * Fill the template and fit it to the channel. The link always comes last and
 * is never shortened; the excerpt gives way first, then the title.
 */
export function composeAnnouncement(entry: Pick<ChangelogEntry, "slug" | "title" | "excerpt" | "version" | "categories">, cfg: LivingChangelogConfig, channel: Pick<Announcer, "maxChars" | "urlCost">): Announcement {
  const url = entryUrl(cfg, entry.slug);
  const tags = (cfg.announce?.hashtags ?? []).map((t) => `#${t.replace(/^#/, "").replace(/\s+/g, "")}`).filter((t) => t.length > 1).join(" ");
  const tail = `${tags ? ` ${tags}` : ""} ${url}`;
  const tailCost = graphemes(tail) - graphemes(url) + (channel.urlCost ?? graphemes(url));
  const budget = Math.max(0, channel.maxChars - tailCost);
  const template = cfg.announce?.template?.trim() || DEFAULT_TEMPLATE;
  const render = (title: string, excerpt: string) => template
    .replace(/\{product\}/g, cfg.site.name)
    .replace(/\{version\}/g, entry.version ?? "")
    .replace(/\{categories\}/g, entry.categories.join(", "))
    .replace(/\{title\}/g, title)
    .replace(/\{excerpt\}/g, excerpt)
    .replace(/\(\s*\)|\[\s*\]/g, "")
    .replace(/[ \t]{2,}/g, " ").replace(/\s+([:,.])/g, "$1").replace(/:\s*$/, "").trim();
  let excerpt = entry.excerpt.trim();
  let title = entry.title.trim();
  let body = render(title, excerpt);
  if (graphemes(body) > budget) {
    const room = budget - graphemes(render(title, ""));
    excerpt = room > 12 ? fit(excerpt, room) : "";
    body = render(title, excerpt);
  }
  if (graphemes(body) > budget) {
    title = fit(title, Math.max(0, budget - graphemes(render("", ""))));
    body = render(title, "");
  }
  const text = `${body}${tail}`.trim();
  return { text, url, title: entry.title, excerpt: entry.excerpt, version: entry.version, slug: entry.slug };
}

async function load(storage: Storage): Promise<OutboxItem[]> {
  const v = await storage.getState<OutboxItem[]>(OUTBOX);
  return Array.isArray(v) ? v : [];
}

function prune(items: OutboxItem[], nowMs: number): OutboxItem[] {
  const horizon = nowMs - KEEP_DAYS * 86400_000;
  return items.filter((x) => x.status === "pending" || Date.parse(x.sent_at ?? x.enqueued_at) >= horizon).slice(-500);
}

/** Queue one post per channel for a freshly published entry. Returns what was queued (for the receipt). */
export async function enqueueAnnouncements(storage: Storage, entry: ChangelogEntry, cfg: LivingChangelogConfig, announcers: Announcer[], nowMs: number): Promise<{ channel: string; text: string }[]> {
  if (!announcers.length || cfg.announce?.enabled === false) return [];
  const items = await load(storage);
  const notBefore = new Date(nowMs + Math.max(0, cfg.announce?.delayMinutes ?? 0) * 60_000).toISOString();
  const queued: { channel: string; text: string }[] = [];
  for (const a of announcers) {
    const key = `${entry.id}:${a.id}`;
    if (items.some((x) => x.key === key)) continue; // never queue the same post twice
    const { text, url } = composeAnnouncement(entry, cfg, a);
    items.push({ key, entry_id: entry.id, entry_slug: entry.slug, channel: a.id, text, url, title: entry.title, excerpt: entry.excerpt, version: entry.version, status: "pending", attempts: 0, enqueued_at: new Date(nowMs).toISOString(), not_before: notBefore });
    queued.push({ channel: a.id, text });
  }
  await storage.setState(OUTBOX, prune(items, nowMs));
  return queued;
}

export type FlushReport = { sent: { channel: string; slug: string; post_url: string | null }[]; failed: { channel: string; slug: string; error: string; final: boolean }[]; waiting: number };

/** Send whatever is due. Never throws: a social network being down must not fail a changelog tick. */
export async function flushAnnouncements(storage: Storage, announcers: Announcer[], cfg: LivingChangelogConfig, nowMs: number): Promise<FlushReport> {
  const report: FlushReport = { sent: [], failed: [], waiting: 0 };
  let items: OutboxItem[];
  try { items = await load(storage); } catch { return report; }
  if (!items.some((x) => x.status === "pending")) return report;
  const byId = new Map(announcers.map((a) => [a.id, a]));
  for (const item of items) {
    if (item.status !== "pending") continue;
    if (Date.parse(item.not_before) > nowMs) { report.waiting += 1; continue; }
    const announcer = byId.get(item.channel);
    if (!announcer) { report.waiting += 1; continue; } // channel not configured on this server right now; keep it
    // Belt and braces: the text came from gated fields, but a custom template is owner-written.
    const antigens = screen(item.text, cfg);
    if (blocks(antigens)) {
      item.status = "failed"; item.last_error = `blocked by safety gate: ${antigens.map((a) => a.kind).join(", ")}`;
      report.failed.push({ channel: item.channel, slug: item.entry_slug, error: item.last_error, final: true });
      continue;
    }
    item.attempts += 1;
    try {
      const res = await announcer.post({ text: item.text, url: item.url, title: item.title, excerpt: item.excerpt, version: item.version, slug: item.entry_slug });
      item.status = "sent"; item.sent_at = new Date(nowMs).toISOString(); item.post_url = res?.url ?? null; delete item.last_error;
      report.sent.push({ channel: item.channel, slug: item.entry_slug, post_url: item.post_url });
    } catch (err) {
      item.last_error = (err instanceof Error ? err.message : String(err)).slice(0, 300);
      const final = item.attempts >= MAX_ATTEMPTS;
      if (final) item.status = "failed";
      else item.not_before = new Date(nowMs + 2 ** item.attempts * 60_000).toISOString(); // 2, 4, 8, 16 minutes
      report.failed.push({ channel: item.channel, slug: item.entry_slug, error: item.last_error, final });
    }
    // Save after every post so a crash mid-loop can't cause a double post.
    await storage.setState(OUTBOX, items).catch(() => undefined);
  }
  await storage.setState(OUTBOX, prune(items, nowMs)).catch(() => undefined);
  return report;
}

export async function outboxSummary(storage: Storage): Promise<{ pending: number; sent: number; failed: OutboxItem[] }> {
  const items = await load(storage).catch(() => [] as OutboxItem[]);
  return { pending: items.filter((x) => x.status === "pending").length, sent: items.filter((x) => x.status === "sent").length, failed: items.filter((x) => x.status === "failed").slice(-10) };
}
