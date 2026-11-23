/** Documentation-claim normalization and deterministic evidence gates. */

import { sha256 } from "../core/oracle.ts";
import type { LivingDocsConfig } from "./config.ts";
import type { ClaimSourceRef, SectionId, SourceArtifact, TruthClaim, TruthStatus } from "./ports.ts";

export type RawClaim = {
  section?: string;
  statement?: string;
  status?: string;
  confidence?: number;
  sources?: Array<{ source_id?: string; quote?: string; note?: string }>;
  basis?: string;
  tags?: string[];
  requires_confirmation?: boolean;
  metadata?: Record<string, unknown>;
};

export const TRUTH_STATUSES: TruthStatus[] = ["confirmed", "observed", "inferred", "planned", "speculative", "unknown", "needs_confirmation", "requires_audit"];
export const IMPLEMENTATION_KINDS = new Set(["source_code", "configuration", "test", "schema", "api_schema"]);

export function normalizeSpace(s: string): string { return s.replace(/\s+/g, " ").trim(); }
export function normalizeQuote(s: string, max: number): string { return normalizeSpace(s).slice(0, max); }
export function clamp01(n: unknown): number { const x = Number(n); return Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0.5; }

export function sourceSupportsQuote(source: SourceArtifact, quote: string): boolean {
  if (!quote.trim()) return false;
  return normalizeSpace(source.content_excerpt).toLowerCase().includes(normalizeSpace(quote).toLowerCase());
}

export function statusFrom(v: unknown): TruthStatus {
  const s = String(v ?? "").toLowerCase().trim().replace(/[ -]+/g, "_");
  return (TRUTH_STATUSES as string[]).includes(s) ? s as TruthStatus : "requires_audit";
}

export async function claimKey(section: SectionId, statement: string): Promise<string> {
  const normalized = normalizeSpace(statement).toLowerCase().replace(/[^a-z0-9 ]/g, "");
  return (await sha256(`${section}|${normalized}`)).slice(0, 32);
}

function inferBasis(raw: string, sources: SourceArtifact[]): TruthClaim["basis"] {
  const allowed: TruthClaim["basis"][] = ["implementation", "documentation", "test", "configuration", "schema", "creator_context", "external_research", "inference", "unknown"];
  if ((allowed as string[]).includes(raw)) return raw as TruthClaim["basis"];
  if (sources.some((x) => x.kind === "test")) return "test";
  if (sources.some((x) => x.kind === "configuration")) return "configuration";
  if (sources.some((x) => x.kind === "schema" || x.kind === "api_schema")) return "schema";
  if (sources.some((x) => x.kind === "source_code")) return "implementation";
  if (sources.some((x) => x.kind === "documentation")) return "documentation";
  return "unknown";
}

export async function sanitizeClaim(raw: RawClaim, artifacts: SourceArtifact[], sectionIds: readonly SectionId[], cfg: LivingDocsConfig, nowMs: number): Promise<Omit<TruthClaim, "id"> | null> {
  const statement = normalizeSpace(String(raw.statement ?? "")).slice(0, 2400);
  if (statement.length < 8) return null;
  const section = sectionIds.includes(raw.section as SectionId) ? raw.section as SectionId : "overview";
  let status = statusFrom(raw.status);
  let confidence = clamp01(raw.confidence);
  const byId = new Map(artifacts.map((a) => [a.id, a]));
  const sources: ClaimSourceRef[] = [];
  const supportArtifacts: SourceArtifact[] = [];
  for (const s of Array.isArray(raw.sources) ? raw.sources : []) {
    const source_id = String(s.source_id ?? "");
    const artifact = byId.get(source_id);
    if (!artifact || artifact.status !== "active") continue;
    const quote = normalizeQuote(String(s.quote ?? ""), cfg.truthPolicy.maxQuoteChars);
    if (!sourceSupportsQuote(artifact, quote)) continue;
    sources.push({ source_id, quote, ...(s.note ? { note: normalizeSpace(String(s.note)).slice(0, 300) } : {}) });
    supportArtifacts.push(artifact);
  }

  if (cfg.truthPolicy.requireQuoteFor.includes(status) && sources.length === 0) {
    status = "needs_confirmation";
    confidence = Math.min(confidence, 0.49);
  }
  if (status === "confirmed" && confidence < cfg.truthPolicy.verifiedMinConfidence) status = "observed";
  if (status === "confirmed" && sources.length === 0) status = "needs_confirmation";

  // Documentation alone can prove what docs currently SAY, not what the product DOES.
  const tags = [...new Set((Array.isArray(raw.tags) ? raw.tags : []).map((x) => normalizeSpace(String(x)).toLowerCase()).filter(Boolean))].slice(0, 24);
  const behaviorLike = tags.some((t) => ["behavior", "api", "cli", "config", "runtime", "default", "operation"].includes(t));
  if (status === "confirmed" && behaviorLike && supportArtifacts.length && supportArtifacts.every((a) => a.kind === "documentation")) {
    status = "requires_audit";
    confidence = Math.min(confidence, 0.69);
  }

  const basis = inferBasis(String(raw.basis ?? "unknown"), supportArtifacts);
  const at = new Date(nowMs).toISOString();
  return {
    claim_key: await claimKey(section, statement),
    section,
    statement,
    status,
    confidence,
    sources,
    basis,
    tags,
    first_seen_at: at,
    last_verified_at: at,
    stale: false,
    requires_confirmation: raw.requires_confirmation === true || status === "needs_confirmation" || status === "unknown",
    contradictions: [],
    metadata: raw.metadata && typeof raw.metadata === "object" && !Array.isArray(raw.metadata) ? raw.metadata : {},
  };
}

export function claimsAffectedBySources(claims: TruthClaim[], changedOrDeletedIds: Set<string>): TruthClaim[] {
  return claims.filter((c) => c.sources.some((s) => changedOrDeletedIds.has(s.source_id)));
}

export function obviousContradictions(claims: TruthClaim[]): Array<[TruthClaim, TruthClaim]> {
  const out: Array<[TruthClaim, TruthClaim]> = [];
  const norm = (s: string) => normalizeSpace(s).toLowerCase().replace(/[.!?]+$/, "");
  const negate = (s: string) => s.replace(/\b(is|are|has|have|does|can|supports|uses|defaults to|requires)\b/i, "$1 not");
  for (let i = 0; i < claims.length; i += 1) for (let j = i + 1; j < claims.length; j += 1) {
    const a = norm(claims[i]!.statement); const b = norm(claims[j]!.statement);
    if (a === norm(negate(b)) || b === norm(negate(a))) out.push([claims[i]!, claims[j]!]);
  }
  return out;
}

export function claimLedger(claims: TruthClaim[], limit = 500): string {
  return claims.slice(0, limit).map((c) => {
    const refs = c.sources.map((s) => `${s.source_id}: “${s.quote}”`).join(" | ") || "none";
    return `[${c.id}] [${c.status}] [${c.basis}] [confidence ${c.confidence.toFixed(2)}] ${c.statement}\nSOURCES: ${refs}${c.stale ? "\nSTALE: yes" : ""}${c.requires_confirmation ? "\nCONFIRMATION: required" : ""}`;
  }).join("\n\n");
}
