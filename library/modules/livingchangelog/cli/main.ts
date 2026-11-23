#!/usr/bin/env node
/**
 * livingchangelog CLI. Zero dependencies.
 *   npx livingchangelog preview --repo owner/name [--since 14d] [--voice dry]
 */

import { modelsFromEnv } from "../adapters/models.ts";
import type { ShippingPolicy } from "../engine/config.ts";
import type { ModelProvider } from "../engine/ports.ts";
import { VOICE_NAMES, VOICES, isVoiceName, type VoiceName } from "../engine/voice.ts";
import { formatReport, preview } from "./preview.ts";

declare const process: {
  argv: string[]; env: Record<string, string | undefined>; exitCode?: number;
  stdout: { write(s: string): boolean; isTTY?: boolean };
  stderr: { write(s: string): boolean };
};

const VERSION = "1.2.0";

const HELP = `livingchangelog ${VERSION}

Release notes that only claim what actually shipped.

Usage
  npx livingchangelog preview --repo <owner/name> [options]

Preview runs the real engine against a public GitHub repo in memory.
Nothing is published or written anywhere.

Options
  --repo <owner/name>   GitHub repository (or a github.com URL)
  --since <n>[d|w]      How far back to read (default 14d, max 90d)
  --voice <name>        ${VOICE_NAMES.join(" | ")} (default plain)
  --policy <name>       explicit   only releases/production deploys prove shipping (default)
                        merge      a PR merged to the default branch counts as shipped
  --max <n>             Most entries to draft (default 5)
  --commits             Also read default-branch commits (noisier)
  --model <id>          Override the model for the detected provider
  --api <url>           GitHub Enterprise API base (or set GITHUB_API_URL)
  --token <token>       GitHub token (or set GITHUB_TOKEN). Needed for private repos
                        and recommended: unauthenticated calls are limited to 60/hour
  --json                Machine-readable output
  --no-color            Plain output
  -h, --help            Show this help
  -v, --version         Show the version

AI key (optional; without one you get the evidence-only view)
  ANTHROPIC_API_KEY                 uses Claude (default claude-haiku-4-5)
  OPENAI_API_KEY                    uses OpenAI (default gpt-4o-mini)
  LIVINGCHANGELOG_AI_KEY            any OpenAI-compatible endpoint with
  LIVINGCHANGELOG_AI_URL            its base URL (e.g. https://openrouter.ai/api/v1)
  LIVINGCHANGELOG_AI_MODEL          and model name. Without a URL the key is
                                    used with the Lovable AI Gateway.

Voices
${VOICE_NAMES.map((v) => `  ${v.padEnd(10)} ${VOICES[v].description}`).join("\n")}
`;

type Args = Record<string, string | boolean>;

export function parseArgs(argv: string[]): { command: string | null; args: Args } {
  const args: Args = {};
  let command: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!;
    if (a === "-h") args.help = true;
    else if (a === "-v") args.version = true;
    else if (a.startsWith("--")) {
      const [k, inline] = a.slice(2).split("=", 2) as [string, string | undefined];
      if (k.startsWith("no-")) args[k.slice(3)] = false;
      else if (inline !== undefined) args[k] = inline;
      else if (argv[i + 1] && !argv[i + 1]!.startsWith("-")) args[k] = argv[(i += 1)]!;
      else args[k] = true;
    } else if (!command) command = a;
  }
  return { command, args };
}

export function normalizeRepo(input: string): string | null {
  const m = input.trim().replace(/\.git$/, "").match(/^(?:https?:\/\/github\.com\/)?([\w.-]+)\/([\w.-]+)\/?$/i);
  return m ? `${m[1]}/${m[2]}` : null;
}

export function parseSince(input: string | undefined): number | null {
  if (!input) return 14;
  const m = String(input).trim().match(/^(\d+)\s*([dw]?)$/i);
  if (!m) return null;
  const days = Number(m[1]) * (m[2]?.toLowerCase() === "w" ? 7 : 1);
  return days >= 1 && days <= 90 ? days : null;
}

/** Kept as a named export for tests and scripts; the logic lives in adapters/models.ts so the server uses the same rules. */
export function detectModels(env: Record<string, string | undefined>, override?: string): { models: ModelProvider[]; label: string | null } {
  return modelsFromEnv(env, override);
}

export async function main(argv: string[], env: Record<string, string | undefined>, out = (s: string) => process.stdout.write(s), err = (s: string) => process.stderr.write(s)): Promise<number> {
  const { command, args } = parseArgs(argv);
  if (args.version) { out(`${VERSION}\n`); return 0; }
  if (args.help || !command || command === "help") { out(HELP); return command || args.help ? 0 : 1; }
  if (command !== "preview") { err(`Unknown command "${command}". Try: livingchangelog preview --repo owner/name\n`); return 1; }

  const repo = typeof args.repo === "string" ? normalizeRepo(args.repo) : null;
  if (!repo) { err("Please pass --repo owner/name (for example --repo vercel/next.js)\n"); return 1; }
  const sinceDays = parseSince(typeof args.since === "string" ? args.since : undefined);
  if (sinceDays === null) { err("--since must look like 14d or 2w, between 1 and 90 days\n"); return 1; }
  const voice: VoiceName = args.voice === undefined ? "plain" : isVoiceName(args.voice) ? args.voice : (() => { throw new Error(`--voice must be one of ${VOICE_NAMES.join(", ")}`); })();
  const policyArg = args.policy === undefined ? "explicit" : String(args.policy);
  const policy: ShippingPolicy | null = policyArg === "explicit" ? "explicit-only" : policyArg === "merge" ? "merge-to-production-is-live" : null;
  if (!policy) { err("--policy must be explicit or merge\n"); return 1; }
  const maxEntries = args.max === undefined ? 5 : Math.max(1, Math.min(20, Number(args.max) || 5));

  const { models, label } = detectModels(env, typeof args.model === "string" ? args.model : undefined);
  const token = typeof args.token === "string" ? args.token : env.GITHUB_TOKEN ?? env.GH_TOKEN;
  const json = args.json === true;
  const color = !json && args.color !== false && !!process.stdout.isTTY && !env.NO_COLOR;
  if (!json) err(`${label ? `Drafting with ${label}` : "No AI key: evidence-only preview"}${token ? "" : " (no GitHub token: 60 calls/hour)"}…\n`);

  const apiBase = typeof args.api === "string" ? args.api : env.GITHUB_API_URL;
  const result = await preview({ repo, sinceDays, voice, policy, maxEntries, includeCommits: args.commits === true, models, token, ...(apiBase ? { apiBase } : {}) });
  out(json ? `${JSON.stringify(result, null, 2)}\n` : formatReport(result, color));
  return 0;
}

// Run only when executed directly (not when imported by tests).
const invoked = process.argv[1] ?? "";
if (/livingchangelog(\.js|\.ts)?$|cli[\\/]main\.(js|ts)$/.test(invoked)) {
  main(process.argv.slice(2), process.env).then((code) => { process.exitCode = code; }, (e: unknown) => {
    process.stderr.write(`livingchangelog: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  });
}
