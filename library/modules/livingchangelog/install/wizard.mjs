#!/usr/bin/env node
// LivingChangelog zero-dependency setup wizard.
import { createInterface } from "node:readline";
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { stdin, stdout } from "node:process";

const target = new URL("../livingchangelog.config.json", import.meta.url);
const backup = new URL("../livingchangelog.config.backup.json", import.meta.url);
const rl = createInterface({ input: stdin });
const lines = []; const waiters = []; let closed = false;
rl.on("line", (line) => waiters.length ? waiters.shift()(line) : lines.push(line));
rl.on("close", () => { closed = true; while (waiters.length) waiters.shift()(""); });
const next = () => lines.length ? Promise.resolve(lines.shift()) : closed ? Promise.resolve("") : new Promise((r) => waiters.push(r));
const ask = async (q, d = "") => { stdout.write(`${q}${d ? ` [${d}]` : ""}\n> `); return (await next()).trim() || d; };
const list = async (q) => (await ask(`${q} (separate with ;)`)).split(";").map((s) => s.trim()).filter(Boolean);
const slug = (s) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const secret = () => randomBytes(32).toString("base64url");

console.log("\nLivingChangelog — autonomous changelog publisher setup\n");
const cfg = JSON.parse(readFileSync(target, "utf8"));
if (existsSync(target)) { copyFileSync(target, backup); console.log("(Saved current config to livingchangelog.config.backup.json)\n"); }

cfg.site.name = await ask("1. Product or company name?") || "[ENTER PRODUCT OR COMPANY NAME HERE]";
let url = await ask("2. Website URL?"); if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
cfg.site.url = url.replace(/\/+$/, "") || "https://[ENTER-DOMAIN-HERE]";
cfg.site.changelogName = await ask("3. Changelog name?", `${cfg.site.name} Changelog`);
const path = await ask("4. Changelog path?", "/changelog"); cfg.site.changelogPath = `/${path.replace(/^\/+|\/+$/g, "")}`;
cfg.site.tagline = await ask("5. One-line changelog description?") || "[ENTER ONE-LINE CHANGELOG TAGLINE HERE]";
cfg.audience = await ask("6. Who reads it?") || "[ENTER WHO READS RELEASE NOTES HERE]";
// Mirrors engine/voice.ts. The wizard is plain .mjs so it runs without a build step.
const VOICE_PRESETS = {
  plain: "Plain, factual, compact. Lead with user impact. No hype, no emoji, no marketing adjectives. Never turn an internal implementation detail into a customer benefit unless the evidence proves that benefit.",
  friendly: "Warm and direct. Talk to the reader as \"you\". Short sentences, everyday words. Light, never cutesy. At most one exclamation mark per entry. No hype, no emoji, no marketing adjectives. Never promise more than the evidence shows.",
  dry: "Understated and precise. Short declarative sentences. An occasional wry aside about the change itself is allowed, never about users and never in security notes or fixes for problems that hurt people. No hype, no emoji, no exclamation marks.",
  technical: "For developers. Precise and terse. Name APIs, flags, config keys and endpoints exactly as they appear in the evidence and format them as code. State breaking changes and required actions first. No marketing language, no emoji.",
};
const voiceAnswer = (await ask("7. Voice? plain | friendly | dry | technical (or type your own description)", "plain")).trim();
cfg.voice = VOICE_PRESETS[voiceAnswer.toLowerCase()] ?? voiceAnswer;
cfg.productFacts = await ask("8. Current product facts it may rely on? (plans, platforms, real feature names)") || "[ENTER CURRENT PRODUCT FACTS HERE]";
const never = await list("9. Anything it must never claim?"); if (never.length) cfg.neverClaim = [...new Set([...cfg.neverClaim, ...never])];
const policy = await ask("10. Shipping policy: explicit-only, merge-to-production-is-live, or commit-on-production-is-live?", "explicit-only");
if (["explicit-only", "merge-to-production-is-live", "commit-on-production-is-live"].includes(policy)) cfg.sourcePolicy.shippingPolicy = policy;
cfg.sourcePolicy.productionBranch = await ask("11. Production branch?", "main");
const prodEnvs = await list("12. Production environment names GitHub deployments may use"); if (prodEnvs.length) cfg.sourcePolicy.productionEnvironments = [...new Set(prodEnvs.map((x) => x.toLowerCase()))];
const ignored = await list("13. Labels that should never appear in the changelog?"); if (ignored.length) cfg.sourcePolicy.ignoredLabels = [...new Set([...cfg.sourcePolicy.ignoredLabels, ...ignored])];
const dev = (await ask("14. Publish developer-only changes? yes/no", "no")).toLowerCase(); cfg.sourcePolicy.publishDeveloperOnly = /^(y|yes|true|1)$/.test(dev);
const hours = Number(await ask("15. Minimum hours between public entries (bundling window)?", "4")); if (Number.isFinite(hours) && hours >= 0) cfg.cadence.minHoursBetweenEntries = hours;
cfg.seed = slug(cfg.site.name) || "livingchangelog";
rl.close();

writeFileSync(target, `${JSON.stringify(cfg, null, 2)}\n`);
const leftovers = JSON.stringify(cfg).match(/\[ENTER[^\]]*\]/g) ?? [];
console.log(`\nSaved livingchangelog.config.json.${leftovers.length ? `\nWARNING: ${leftovers.length} placeholder(s) remain; the engine will refuse to tick until filled.` : ""}`);
console.log(`\nGenerate/store these as server secrets:\n  LIVINGCHANGELOG_CRON_SECRET=${secret()}\n  LIVINGCHANGELOG_OWNER_SECRET=${secret()}\n  LIVINGCHANGELOG_INGEST_SECRET=${secret()}\n`);
console.log("Still needed: database + schema.sql, AI key(s), at least one evidence source, and a scheduler.\nDry run: POST /api/livingchangelog/tick?dry=1 with the owner secret.");
