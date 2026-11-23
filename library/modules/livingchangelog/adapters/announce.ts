/**
 * Announcement channels over plain fetch + Web Crypto. No SDKs.
 * Each adapter only posts text it is handed; composition and limits live in
 * engine/announce.ts.
 */
import type { Announcement, Announcer } from "../engine/ports.ts";

const enc = new TextEncoder();
const timeout = (ms = 20_000) => AbortSignal.timeout(ms);

async function fail(res: Response, who: string): Promise<never> {
  throw new Error(`${who} ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
}

/** Discord incoming webhook. Mentions are disabled so a title can never ping @everyone. */
export function discord(opts: { webhookUrl: string; id?: string; username?: string }): Announcer {
  return {
    id: opts.id ?? "discord", maxChars: 2000,
    async post(a) {
      const res = await fetch(`${opts.webhookUrl}${opts.webhookUrl.includes("?") ? "&" : "?"}wait=true`, {
        method: "POST", headers: { "content-type": "application/json" }, signal: timeout(),
        body: JSON.stringify({ content: a.text, allowed_mentions: { parse: [] }, ...(opts.username ? { username: opts.username } : {}) }),
      });
      if (!res.ok) await fail(res, "Discord");
      return { url: null };
    },
  };
}

/** Slack incoming webhook. &, < and > are escaped as Slack requires. */
export function slack(opts: { webhookUrl: string; id?: string }): Announcer {
  return {
    id: opts.id ?? "slack", maxChars: 3000,
    async post(a) {
      const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const res = await fetch(opts.webhookUrl, { method: "POST", headers: { "content-type": "application/json" }, signal: timeout(), body: JSON.stringify({ text: esc(a.text), unfurl_links: true }) });
      if (!res.ok) await fail(res, "Slack");
      return { url: null };
    },
  };
}

/** Mastodon (any instance). Links count as 23 characters there. Idempotency-Key stops duplicate toots on retry. */
export function mastodon(opts: { instanceUrl: string; accessToken: string; id?: string; visibility?: "public" | "unlisted" }): Announcer {
  const base = opts.instanceUrl.replace(/\/+$/, "");
  return {
    id: opts.id ?? "mastodon", maxChars: 500, urlCost: 23,
    async post(a) {
      const res = await fetch(`${base}/api/v1/statuses`, {
        method: "POST", signal: timeout(),
        headers: { "content-type": "application/json", authorization: `Bearer ${opts.accessToken}`, "idempotency-key": `livingchangelog:${a.slug}` },
        body: JSON.stringify({ status: a.text, visibility: opts.visibility ?? "public" }),
      });
      if (!res.ok) await fail(res, "Mastodon");
      const data = await res.json() as { url?: string };
      return { url: data.url ?? null };
    },
  };
}

/** Byte offsets Bluesky needs for a clickable link inside the post text. */
export function bskyLinkFacet(text: string, url: string): { index: { byteStart: number; byteEnd: number }; features: { $type: string; uri: string }[] } | null {
  const at = text.lastIndexOf(url);
  if (at < 0) return null;
  const byteStart = enc.encode(text.slice(0, at)).length;
  return { index: { byteStart, byteEnd: byteStart + enc.encode(url).length }, features: [{ $type: "app.bsky.richtext.facet#link", uri: url }] };
}

/** Bluesky with an app password (Settings, Privacy and security, App passwords). Adds a link card. */
export function bluesky(opts: { handle: string; appPassword: string; service?: string; id?: string }): Announcer {
  const service = (opts.service ?? "https://bsky.social").replace(/\/+$/, "");
  let session: { jwt: string; did: string; at: number } | null = null;
  const login = async () => {
    if (session && Date.now() - session.at < 60 * 60_000) return session;
    const res = await fetch(`${service}/xrpc/com.atproto.server.createSession`, { method: "POST", headers: { "content-type": "application/json" }, signal: timeout(), body: JSON.stringify({ identifier: opts.handle, password: opts.appPassword }) });
    if (!res.ok) await fail(res, "Bluesky login");
    const data = await res.json() as { accessJwt: string; did: string };
    session = { jwt: data.accessJwt, did: data.did, at: Date.now() };
    return session;
  };
  return {
    id: opts.id ?? "bluesky", maxChars: 300,
    async post(a) {
      const s = await login();
      const facet = bskyLinkFacet(a.text, a.url);
      const record = {
        $type: "app.bsky.feed.post", text: a.text, createdAt: new Date().toISOString(),
        ...(facet ? { facets: [facet] } : {}),
        embed: { $type: "app.bsky.embed.external", external: { uri: a.url, title: a.title.slice(0, 300), description: a.excerpt.slice(0, 1000) } },
      };
      const res = await fetch(`${service}/xrpc/com.atproto.repo.createRecord`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${s.jwt}` }, signal: timeout(), body: JSON.stringify({ repo: s.did, collection: "app.bsky.feed.post", record }) });
      if (!res.ok) { if (res.status === 401) session = null; await fail(res, "Bluesky"); }
      const data = await res.json() as { uri?: string };
      const rkey = data.uri?.split("/").pop();
      return { url: rkey ? `https://bsky.app/profile/${opts.handle}/post/${rkey}` : null };
    },
  };
}

// ---- X (Twitter) with OAuth 1.0a user context: these tokens don't expire, unlike OAuth 2 user tokens. ----

const pct = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

async function hmacSha1Base64(key: string, data: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
  let bin = "";
  for (const b of sig) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** RFC 5849 signature. Exported so it can be checked against X's published worked example. */
export async function oauth1Signature(method: string, url: string, params: Record<string, string>, consumerSecret: string, tokenSecret: string): Promise<string> {
  const norm = Object.keys(params).map((k) => [pct(k), pct(params[k]!)] as const).sort(([a, x], [b, y]) => (a === b ? (x < y ? -1 : 1) : a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join("&");
  const base = `${method.toUpperCase()}&${pct(url)}&${pct(norm)}`;
  return hmacSha1Base64(`${pct(consumerSecret)}&${pct(tokenSecret)}`, base);
}

export function x(opts: { apiKey: string; apiSecret: string; accessToken: string; accessSecret: string; id?: string; apiBase?: string }): Announcer {
  const endpoint = `${(opts.apiBase ?? "https://api.x.com").replace(/\/+$/, "")}/2/tweets`;
  return {
    id: opts.id ?? "x", maxChars: 280, urlCost: 23,
    async post(a) {
      const nonce = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
      const oauth: Record<string, string> = {
        oauth_consumer_key: opts.apiKey, oauth_nonce: nonce, oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: String(Math.floor(Date.now() / 1000)), oauth_token: opts.accessToken, oauth_version: "1.0",
      };
      // A JSON body is not part of the OAuth 1.0a signature base string; only oauth_* (and query) params are.
      oauth.oauth_signature = await oauth1Signature("POST", endpoint, oauth, opts.apiSecret, opts.accessSecret);
      const header = `OAuth ${Object.keys(oauth).sort().map((k) => `${pct(k)}="${pct(oauth[k]!)}"`).join(", ")}`;
      const res = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", authorization: header }, signal: timeout(), body: JSON.stringify({ text: a.text }) });
      if (!res.ok) await fail(res, "X");
      const data = await res.json() as { data?: { id?: string } };
      return { url: data.data?.id ? `https://x.com/i/web/status/${data.data.id}` : null };
    },
  };
}

/** Any URL. Signed with HMAC-SHA256 when a secret is set, so the receiver can verify it came from you. */
export function webhook(opts: { url: string; secret?: string; id?: string }): Announcer {
  return {
    id: opts.id ?? "webhook", maxChars: 5000,
    async post(a: Announcement) {
      const body = JSON.stringify({ event: "entry.published", ...a });
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (opts.secret) {
        const k = await crypto.subtle.importKey("raw", enc.encode(opts.secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(body)));
        headers["x-livingchangelog-signature"] = `sha256=${[...sig].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
      }
      const res = await fetch(opts.url, { method: "POST", headers, body, signal: timeout() });
      if (!res.ok) await fail(res, "Webhook");
      return { url: null };
    },
  };
}

/**
 * Build every channel whose env vars are set. Half-configured channels are
 * reported (for /health) rather than silently ignored.
 */
export function announcersFromEnv(env: Record<string, string | undefined>): { announcers: Announcer[]; problems: string[] } {
  const announcers: Announcer[] = [];
  const problems: string[] = [];
  const has = (k: string) => !!env[k]?.trim();
  const group = (name: string, keys: string[], make: () => Announcer) => {
    const set = keys.filter(has);
    if (set.length === keys.length) announcers.push(make());
    else if (set.length) problems.push(`${name} announcements need ${keys.filter((k) => !has(k)).join(" and ")}`);
  };
  group("Discord", ["LIVINGCHANGELOG_DISCORD_WEBHOOK_URL"], () => discord({ webhookUrl: env.LIVINGCHANGELOG_DISCORD_WEBHOOK_URL! }));
  group("Slack", ["LIVINGCHANGELOG_SLACK_WEBHOOK_URL"], () => slack({ webhookUrl: env.LIVINGCHANGELOG_SLACK_WEBHOOK_URL! }));
  group("Mastodon", ["LIVINGCHANGELOG_MASTODON_URL", "LIVINGCHANGELOG_MASTODON_TOKEN"], () => mastodon({ instanceUrl: env.LIVINGCHANGELOG_MASTODON_URL!, accessToken: env.LIVINGCHANGELOG_MASTODON_TOKEN! }));
  group("Bluesky", ["LIVINGCHANGELOG_BLUESKY_HANDLE", "LIVINGCHANGELOG_BLUESKY_APP_PASSWORD"], () => bluesky({ handle: env.LIVINGCHANGELOG_BLUESKY_HANDLE!, appPassword: env.LIVINGCHANGELOG_BLUESKY_APP_PASSWORD!, ...(env.LIVINGCHANGELOG_BLUESKY_SERVICE ? { service: env.LIVINGCHANGELOG_BLUESKY_SERVICE } : {}) }));
  group("X", ["LIVINGCHANGELOG_X_API_KEY", "LIVINGCHANGELOG_X_API_SECRET", "LIVINGCHANGELOG_X_ACCESS_TOKEN", "LIVINGCHANGELOG_X_ACCESS_SECRET"], () => x({ apiKey: env.LIVINGCHANGELOG_X_API_KEY!, apiSecret: env.LIVINGCHANGELOG_X_API_SECRET!, accessToken: env.LIVINGCHANGELOG_X_ACCESS_TOKEN!, accessSecret: env.LIVINGCHANGELOG_X_ACCESS_SECRET! }));
  group("Webhook", ["LIVINGCHANGELOG_ANNOUNCE_WEBHOOK_URL"], () => webhook({ url: env.LIVINGCHANGELOG_ANNOUNCE_WEBHOOK_URL!, ...(env.LIVINGCHANGELOG_ANNOUNCE_WEBHOOK_SECRET ? { secret: env.LIVINGCHANGELOG_ANNOUNCE_WEBHOOK_SECRET } : {}) }));
  return { announcers, problems };
}
