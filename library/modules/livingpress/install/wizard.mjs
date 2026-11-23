#!/usr/bin/env node
// LivingPress install wizard. Zero dependencies. Run: node install/wizard.mjs
// Asks the owner the setup questions, writes livingpress.config.json next to
// package.json, prints two fresh secrets, and checks the result.
import { createInterface } from "node:readline";
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { stdin, stdout } from "node:process";
import { pathToFileURL } from "node:url";

const target = process.env.LIVINGPRESS_CONFIG_PATH
  ? pathToFileURL(process.env.LIVINGPRESS_CONFIG_PATH)
  : new URL("../livingpress.config.json", import.meta.url);

// Line queue: works both interactively and with piped answers.
const rl = createInterface({ input: stdin });
const lines = [];
const waiters = [];
let closed = false;
rl.on("line", (l) => (waiters.length ? waiters.shift()(l) : lines.push(l)));
rl.on("close", () => { closed = true; while (waiters.length) waiters.shift()(""); });
const next = () => (lines.length ? Promise.resolve(lines.shift()) : closed ? Promise.resolve("") : new Promise((r) => waiters.push(r)));
const ask = async (q, d = "") => { stdout.write(`${q}${d ? ` [${d}]` : ""}\n> `); return (await next()).trim() || d; };
const list = async (q) => (await ask(`${q} (separate with ;)`)).split(";").map((s) => s.trim()).filter(Boolean);
/** Re-ask until valid; after 3 tries keep the default so piped installs never hang. */
const askValid = async (q, d, valid, hint) => {
  for (let i = 0; i < 3; i += 1) {
    const a = await ask(q, d);
    if (valid(a)) return a;
    stdout.write(`   ${hint}\n`);
    if (closed && !lines.length) break;
  }
  return d;
};
const num = async (q, d, min) => {
  const n = Number(await askValid(q, String(d), (a) => Number.isFinite(Number(a)) && Number(a) >= min, `Please enter a number >= ${min}.`));
  return Number.isFinite(n) && n >= min ? n : d;
};
const slug = (s) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const PLACEHOLDER = (s) => `[ENTER ${s} HERE]`;

console.log("\nLivingPress: Autonomous Editorial Engine — setup\n");
const cfg = JSON.parse(readFileSync(existsSync(target) ? target : new URL("../livingpress.config.json", import.meta.url), "utf8"));
if (existsSync(target)) { copyFileSync(target, new URL("./livingpress.config.backup.json", target)); console.log("(Saved your current config to livingpress.config.backup.json)\n"); }

cfg.site.name = await ask("1. Business or site name?") || PLACEHOLDER("SITE NAME");
let url = await askValid("2. Website address (https://...)?", "", (a) => !a || /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(a) || /^[^\s/]+\.[^\s/]+/.test(a), "That doesn't look like a web address, e.g. https://example.com");
if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
cfg.site.url = url.replace(/\/+$/, "") || "https://[ENTER-DOMAIN-HERE]";
cfg.site.blogName = await ask("3. What should the blog be called?", `${cfg.site.name} Journal`);
const path = await ask("4. Where should the blog live on the site?", "/blog");
cfg.site.blogPath = `/${path.replace(/^\/+|\/+$/g, "")}`;
cfg.site.tagline = await ask("5. One-line description of the blog?") || PLACEHOLDER("ONE-LINE BLOG TAGLINE");
cfg.audience = await ask("6. Who is the reader? Be specific.") || PLACEHOLDER("WHO THE READER IS");
cfg.voice = await ask("7. How should it sound? (or press Enter for plain/direct/no hype)", cfg.voice);
cfg.houseFacts = await ask("8. The facts it may state — what you sell, prices, hours, guarantees. ONLY what is true today.") || PLACEHOLDER("HOUSE FACTS");
const never = await list("9. What must it NEVER claim?");
if (never.length) cfg.neverClaim = [...new Set([...never, ...cfg.neverClaim])];
const hated = await list("10. Any words you hate seeing? (old posts get corrected when they contain them)");
for (const w of hated) {
  const pattern = `\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[- ]")}\\b`;
  if (!cfg.retiredWords.some((r) => r.pattern === pattern)) cfg.retiredWords.push({ pattern, replaceWith: "say it plainly" });
}
const topics = await list("11. Content topics — 3 to 6 subjects the blog should own");
if (topics.length) {
  cfg.clusters = [];
  const ids = new Set();
  for (const [i, label] of topics.entries()) {
    const thesis = await ask(`   11.${i + 1} What is the core argument about "${label}"?`) || PLACEHOLDER("THE ARGUMENT THIS TOPIC MAKES");
    const keywords = await list(`   11.${i + 1} Search terms for "${label}"`);
    let id = slug(label) || `topic-${i + 1}`;
    for (let n = 2; ids.has(id); n += 1) id = `${slug(label) || "topic"}-${n}`;
    ids.add(id);
    cfg.clusters.push({ id, label, thesis, keywords: keywords.length ? keywords : [label.toLowerCase()] });
  }
  if (topics.length < 3) console.log("   Note: 3 or more topics gives the planner room to breathe.");
}
const pains = await list("12. Real problems your readers have");
if (pains.length) cfg.painPoints = pains;
const links = await list("13. Site pages it may link to, as path=Name (e.g. /pricing=Pricing)");
cfg.siteLinks = [{ path: "/", label: "Home", note: "home" }];
for (const l of links) {
  const [rawPath, label] = l.split("=");
  const p = `/${(rawPath ?? "").trim().replace(/^https?:\/\/[^/]+/i, "").replace(/^\/+|\/+$/g, "")}`;
  if (p !== "/" && !cfg.siteLinks.some((x) => x.path === p)) cfg.siteLinks.push({ path: p, label: (label ?? rawPath).trim(), note: "site page" });
}
cfg.advocacyEvery = Math.round(await num("14. Every how-many posts may it directly recommend you? (others just help)", 3, 1));
cfg.cadence.minHoursBetweenPosts = await num("15. Minimum hours between posts?", 20, 0);
cfg.seed = slug(cfg.site.name) || "livingpress";
rl.close();

writeFileSync(target, `${JSON.stringify(cfg, null, 2)}\n`);

// Same placeholder rule the engine enforces at tick time (validateConfig).
const left = [];
const walk = (v, p) => {
  if (typeof v === "string" && /\[ENTER[^\]]*\]/.test(v)) left.push(p);
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, p ? `${p}.${k}` : k);
};
walk(cfg, "");

const secret = () => randomBytes(32).toString("base64url");
console.log(`\nSaved livingpress.config.json.
${left.length ? `\nStill unanswered (the engine will not run until these are filled):\n${left.map((p) => `  - ${p}`).join("\n")}\n` : "\nEvery question is answered.\n"}
Two fresh secrets — store them as server secrets, never in the browser:
  LIVINGPRESS_CRON_SECRET=${secret()}
  LIVINGPRESS_OWNER_SECRET=${secret()}   (give this one to the owner only)

Still needed (see README "Gather"): a database, an AI key, images (images.json), and a scheduler.
Tip: after install, POST /api/livingpress/tick?dry=1 with the owner secret to read a draft before anything goes live.`);
