/** LivingGuide engine: ingest -> prove -> model -> audit -> preserve. */

import { acquireLease, releaseLease } from "../core/lease.ts";
import { Breaker } from "./breaker.ts";
import { demoteH1 } from "./markdown.ts";
import { Nexus } from "./nexus.ts";
import { sealRun } from "./receipts.ts";
import { deterministicClaimAudit, deterministicManualAudit, normalizeModelFindings, scoreAudit, type RawModelFinding } from "./audit.ts";
import { sectionsForPreset, SECTION_TITLES, validateConfig, type LivingGuideConfig } from "./config.ts";
import { auditSystem, claimsAuditPrompt, extractionPrompt, extractionSystem, manualAuditPrompt, resurrectionPrompt, sectionPrompt, sectionSystem } from "./prompts.ts";
import { canonicalHtml, canonicalMarkdown } from "./render.ts";
import { deterministicResurrection, mergeResurrection } from "./resurrection.ts";
import { syncSources, type SyncReport } from "./source.ts";
import { claimsAffectedBySources, sanitizeClaim, type RawClaim } from "./truth.ts";
import type { AuditFinding, AuditSummary, CanonicalGuide, GuideSection, ModelProvider, ProjectSource, ResurrectionCheck, RunOutcome, SectionId, SourceArtifact, Storage, TruthClaim, TruthStatus } from "./ports.ts";

export type Deps = {
  storage: Storage;
  models: ModelProvider[];
  sources: ProjectSource[];
  config: LivingGuideConfig;
  now?: () => number;
  dryRun?: boolean;
};

export type BuildResult = {
  outcome: RunOutcome;
  reason: string;
  guide?: CanonicalGuide;
  draft?: { markdown: string; html: string; sections: GuideSection[] };
  sync?: SyncReport;
  findings: AuditFinding[];
  resurrection?: ResurrectionCheck;
  model?: string | null;
};

type ExtractionResult = { claims?: RawClaim[] };
type ClaimsAuditResult = { findings?: RawModelFinding[] };
type ManualAuditResult = { findings?: RawModelFinding[]; scores?: Partial<AuditSummary> };
type ResurrectionRaw = { answerable?: string[]; defects?: string[]; notes?: string[]; score?: number };

const clampScore = (n: unknown): number => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

function batchArtifacts(artifacts: SourceArtifact[], cfg: LivingGuideConfig): SourceArtifact[][] {
  const batches: SourceArtifact[][] = []; let batch: SourceArtifact[] = []; let chars = 0;
  for (const a of artifacts) {
    const n = a.content_excerpt.length;
    if (batch.length && (batch.length >= cfg.generation.maxArtifactsPerExtractionBatch || chars + n > cfg.generation.maxExtractionChars)) { batches.push(batch); batch = []; chars = 0; }
    batch.push(a); chars += n;
  }
  if (batch.length) batches.push(batch);
  return batches;
}

export function scrubSensitiveText(text: string): string {
  return text
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, "[SECURE SECRET REFERENCE: stored outside this document]")
    .replace(/\bgh[pousr]_[A-Za-z0-9_]{16,}\b/g, "[SECURE SECRET REFERENCE: stored outside this document]")
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, "[SECURE SECRET REFERENCE: stored outside this document]")
    .replace(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, "[SECURE SECRET REFERENCE: stored outside this document]")
    .replace(/((?:password|passwd|api[_ -]?key|secret|token)\s*[:=]\s*[\"']?)[^\s\"']{12,}/gi, "$1[SECURE SECRET REFERENCE: stored outside this document]");
}

function normalizeSectionMarkdown(section: SectionId, raw: string): string {
  let body = demoteH1(scrubSensitiveText(String(raw ?? "")).replace(/^\s*```(?:markdown)?\s*/i, "").replace(/```\s*$/i, "").trim());
  const title = SECTION_TITLES[section];
  if (!new RegExp(`^##\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "im").test(body)) body = `## ${title}\n\n${body}`;
  return body;
}

function fallbackSection(section: SectionId): string {
  return `## ${SECTION_TITLES[section]}\n\n**Status: Unknown / requires further audit.** The current source inventory does not contain enough supported information to populate this section without guessing.`;
}

async function persistFindings(storage: Storage, findings: Omit<AuditFinding, "id">[], dry: boolean): Promise<AuditFinding[]> {
  if (dry) return findings.map((f, i) => ({ ...f, id: `dry_finding_${i + 1}` }));
  const out: AuditFinding[] = [];
  for (const f of findings) out.push(await storage.insertFinding(f));
  return out;
}

function downgradeStatus(v: unknown): TruthStatus | null {
  return ["requires_audit", "needs_confirmation", "unknown"].includes(String(v)) ? String(v) as TruthStatus : null;
}

async function applyAuditDowngrades(storage: Storage, claims: TruthClaim[], findings: Array<Omit<AuditFinding, "id"> | AuditFinding>, dry: boolean): Promise<void> {
  if (dry) return;
  const byId = new Map(claims.map((c) => [c.id, c]));
  for (const f of findings) {
    const forced = ["unsupported-certainty", "orphan-source", "bad-quote"].includes(f.kind) ? "requires_audit" as TruthStatus : downgradeStatus(f.metadata?.downgrade_to);
    if (!forced) continue;
    for (const id of f.claim_ids) {
      const c = byId.get(id); if (!c) continue;
      await storage.updateClaim(id, { status: forced, stale: forced === "requires_audit" ? true : c.stale, requires_confirmation: forced !== "requires_audit" ? true : c.requires_confirmation, last_verified_at: c.last_verified_at });
    }
  }
}

async function extractChangedClaims(nexus: Nexus, storage: Storage, cfg: LivingGuideConfig, allArtifacts: SourceArtifact[], changedIds: Set<string>, nowMs: number, dry: boolean): Promise<number> {
  const changed = allArtifacts.filter((a) => a.status === "active" && changedIds.has(a.id));
  let count = 0;
  for (const batch of batchArtifacts(changed, cfg)) {
    const res = await nexus.json<ExtractionResult>(
      [{ role: "system", content: extractionSystem(cfg) }, { role: "user", content: extractionPrompt(cfg, batch) }],
      { claims: [] },
      { maxTokens: 6000, temperature: 0.05 },
    );
    for (const raw of Array.isArray(res.value.claims) ? res.value.claims.slice(0, cfg.generation.maxClaimsPerBatch) : []) {
      const c = await sanitizeClaim(raw, batch, sectionsForPreset({ ...cfg, preset: "founder" }), cfg, nowMs);
      if (!c) continue;
      if (!dry) await storage.upsertClaim(c);
      count += 1;
    }
  }
  return count;
}

async function modelClaimAudit(nexus: Nexus, cfg: LivingGuideConfig, claims: TruthClaim[], artifacts: SourceArtifact[], nowMs: number): Promise<Omit<AuditFinding, "id">[]> {
  if (!claims.length) return [];
  const res = await nexus.json<ClaimsAuditResult>(
    [{ role: "system", content: auditSystem(cfg) }, { role: "user", content: claimsAuditPrompt(claims, artifacts) }],
    { findings: [] }, { maxTokens: 5000, temperature: 0.02 },
  );
  return normalizeModelFindings(res.value.findings ?? [], nowMs);
}

async function generateSections(nexus: Nexus, cfg: LivingGuideConfig, claims: TruthClaim[]): Promise<GuideSection[]> {
  const out: GuideSection[] = []; const headings: string[] = [];
  const selected = sectionsForPreset(cfg);
  for (const section of selected) {
    let relevant = claims.filter((c) => c.section === section);
    if (["executive-summary", "canonical-summary"].includes(section)) relevant = [...claims].sort((a, b) => Number(a.stale) - Number(b.stale)).slice(0, cfg.generation.maxClaimsPerSection);
    if (!relevant.length) { out.push({ id: section, title: SECTION_TITLES[section], markdown: fallbackSection(section), claim_ids: [] }); continue; }
    const res = await nexus.chat(
      [{ role: "system", content: sectionSystem(cfg) }, { role: "user", content: sectionPrompt(cfg, section, relevant, headings) }],
      { maxTokens: section === "feature-inventory" || section === "architecture-analysis" ? 4500 : 2800, temperature: 0.16 },
    );
    const markdown = normalizeSectionMarkdown(section, res.text);
    for (const m of markdown.matchAll(/^###\s+(.+)$/gm)) headings.push(m[1]!.trim());
    out.push({ id: section, title: SECTION_TITLES[section], markdown, claim_ids: relevant.map((c) => c.id) });
  }
  return out;
}

async function modelManualAudit(nexus: Nexus, cfg: LivingGuideConfig, sections: GuideSection[], claims: TruthClaim[], nowMs: number): Promise<{ findings: Omit<AuditFinding, "id">[]; scores: Partial<AuditSummary> }> {
  const res = await nexus.json<ManualAuditResult>(
    [{ role: "system", content: auditSystem(cfg) }, { role: "user", content: manualAuditPrompt(sections, claims) }],
    { findings: [], scores: {} }, { maxTokens: 4500, temperature: 0.02 },
  );
  return { findings: normalizeModelFindings(res.value.findings ?? [], nowMs), scores: res.value.scores ?? {} };
}

async function modelResurrection(nexus: Nexus, claims: TruthClaim[]): Promise<ResurrectionRaw | null> {
  if (!claims.length) return null;
  const res = await nexus.json<ResurrectionRaw>(
    [{ role: "system", content: "You are a skeptical future operator testing whether project knowledge survived. Return JSON only." }, { role: "user", content: resurrectionPrompt(claims) }],
    { answerable: [], defects: [], notes: [], score: 0 }, { maxTokens: 2600, temperature: 0.02 },
  );
  return res.value;
}

export async function runBuild(deps: Deps): Promise<BuildResult> {
  const now = deps.now ?? Date.now; const t0 = now(); const dry = !!deps.dryRun;
  const cfgProblems = validateConfig(deps.config);
  if (cfgProblems.length) return { outcome: "blocked", reason: `Configuration is incomplete: ${cfgProblems.slice(0, 5).join("; ")}`, findings: [] };
  if (!deps.models.length) return { outcome: "blocked", reason: "LivingGuide build needs at least one model provider. Scanning/status can run without AI.", findings: [] };
  const breaker = new Breaker(deps.storage, now, deps.config.breaker);
  const admitted = await breaker.admit();
  if (!admitted.ok) {
    const until = (admitted.state.openedAt ?? t0) + deps.config.breaker.cooldownMinutes * 60_000;
    return { outcome: "tripped", reason: `Breaker is open until approximately ${new Date(until).toISOString()}.`, findings: [] };
  }
  const owner = `guide-${t0}`;
  if (!(await acquireLease(deps.storage, "build", owner, t0))) return { outcome: "silent", reason: "Another LivingGuide build currently holds the project lease.", findings: [] };

  let sync: SyncReport | undefined;
  try {
    sync = await syncSources(deps.storage, deps.sources, t0);
    let artifacts = await deps.storage.listArtifacts(deps.config.sourcePolicy.maxFiles + 500, true);
    let claims = await deps.storage.listClaims(10000);
    const affectedIds = new Set([...sync.changedIds, ...sync.deletedIds]);
    const affected = claimsAffectedBySources(claims, affectedIds);
    if (!dry) for (const c of affected) await deps.storage.updateClaim(c.id, { stale: true, status: c.status === "confirmed" || c.status === "observed" ? "requires_audit" : c.status });

    // First generation extracts all active artifacts. Later runs extract only changed/new artifacts.
    const extractionIds = new Set(sync.changedIds);
    if (!claims.length) for (const a of artifacts.filter((x) => x.status === "active")) extractionIds.add(a.id);
    const nexus = new Nexus(deps.models, deps.storage, now);
    const extracted = await extractChangedClaims(nexus, deps.storage, deps.config, artifacts, extractionIds, t0, dry);
    if (dry && extracted && !claims.length) {
      // Dry run cannot persist extracted claims, so it cannot honestly render a canonical guide from them.
      await breaker.success();
      return { outcome: "silent", reason: `Dry scan extracted ${extracted} candidate claim(s), but dry mode does not persist them; run a normal build to create the guide.`, findings: [], sync, model: nexus.lastModel };
    }

    claims = await deps.storage.listClaims(10000);
    artifacts = await deps.storage.listArtifacts(deps.config.sourcePolicy.maxFiles + 500, true);
    const deterministic = deterministicClaimAudit(claims, artifacts, deps.config, t0);
    const modelFindings = await modelClaimAudit(nexus, deps.config, claims, artifacts, t0);
    await applyAuditDowngrades(deps.storage, claims, [...deterministic, ...modelFindings], dry);
    claims = await deps.storage.listClaims(10000);

    const baseResurrection = deterministicResurrection(claims);
    const resurrection = mergeResurrection(baseResurrection, await modelResurrection(nexus, claims));
    const sections = await generateSections(nexus, deps.config, claims);
    const manualModel = await modelManualAudit(nexus, deps.config, sections, claims, t0);
    const manualDeterministic = deterministicManualAudit(sections, deps.config, t0);
    const allRawFindings = [...deterministic, ...modelFindings, ...manualDeterministic, ...manualModel.findings];
    const savedFindings = await persistFindings(deps.storage, allRawFindings, dry);

    const required = sectionsForPreset(deps.config).length;
    const populated = sections.filter((s) => s.claim_ids.length > 0).length;
    const audit = scoreAudit(claims, savedFindings, populated, required, resurrection.score, manualModel.scores);
    const previous = await deps.storage.getLatestGuide(deps.config.preset);
    const version = (previous?.version ?? 0) + 1;
    const generatedAt = new Date(t0).toISOString();
    const markdown = canonicalMarkdown({ cfg: deps.config, sections, claims, artifacts, findings: savedFindings, audit, resurrection, generatedAt, version });
    const html = canonicalHtml(markdown, deps.config);
    const critical = savedFindings.filter((f) => f.severity === "critical");

    if (critical.length) {
      const run = await sealRun(deps.storage, { at: generatedAt, outcome: "blocked", reason: `Final audit found ${critical.length} critical issue(s); canonical guide was not committed.`, model: nexus.lastModel || null, source_count: artifacts.filter((a) => a.status === "active").length, claim_count: claims.length, finding_count: savedFindings.length, guide_version: version, score: audit.truthfulness, strategy: "truth-audit", detail: { sync, critical: critical.map((f) => f.kind), extracted } });
      await breaker.success();
      return { outcome: run.outcome, reason: run.reason, draft: { markdown, html, sections }, sync, findings: savedFindings, resurrection, model: nexus.lastModel };
    }

    const unsaved: Omit<CanonicalGuide, "id"> = {
      version, preset: deps.config.preset, title: `${deps.config.project.name} — Owner's Manual & Strategic Intelligence File`, markdown, html, generated_at: generatedAt,
      source_ids: artifacts.filter((a) => a.status === "active").map((a) => a.id), claim_ids: claims.map((c) => c.id), sections, audit_summary: audit, resurrection,
      metadata: { extracted_claims_this_build: extracted, sync, source_warnings: sync.warnings },
    };
    const guide = dry ? { ...unsaved, id: "dry_guide" } : await deps.storage.insertGuide(unsaved);
    if (!dry) await deps.storage.setState("engine.counters", { builds: Number((await deps.storage.getState<{ builds?: number }>("engine.counters"))?.builds ?? 0) + 1, last_build_at: generatedAt });
    await sealRun(deps.storage, { at: generatedAt, outcome: "generated", reason: `Generated canonical guide v${version} from ${claims.length} claim(s) and ${artifacts.filter((a) => a.status === "active").length} active source artifact(s).`, model: nexus.lastModel || null, source_count: artifacts.filter((a) => a.status === "active").length, claim_count: claims.length, finding_count: savedFindings.length, guide_version: version, score: audit.truthfulness, strategy: "canonical-build", detail: { sync, extracted, resurrection: resurrection.score } });
    await breaker.success();
    return { outcome: "generated", reason: `Generated canonical guide v${version}.`, guide, sync, findings: savedFindings, resurrection, model: nexus.lastModel };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err); const st = await breaker.failure(message);
    await sealRun(deps.storage, { at: new Date(t0).toISOString(), outcome: st.status === "open" ? "tripped" : "error", reason: message.slice(0, 500), model: null, source_count: null, claim_count: null, finding_count: null, guide_version: null, score: null, strategy: "build-error", detail: { sync } }).catch(() => undefined);
    return { outcome: st.status === "open" ? "tripped" : "error", reason: message, findings: [], sync };
  } finally {
    await releaseLease(deps.storage, "build", owner).catch(() => undefined);
  }
}

export async function runResurrection(deps: Pick<Deps, "storage" | "models" | "now">): Promise<ResurrectionCheck> {
  const now = deps.now ?? Date.now; const claims = await deps.storage.listClaims(10000); const base = deterministicResurrection(claims);
  if (!deps.models.length) return base;
  const nexus = new Nexus(deps.models, deps.storage, now); const merged = mergeResurrection(base, await modelResurrection(nexus, claims));
  await sealRun(deps.storage, { at: new Date(now()).toISOString(), outcome: "resurrection", reason: `Resurrection test scored ${merged.score}/100.`, model: nexus.lastModel || null, source_count: null, claim_count: claims.length, finding_count: merged.defects.length, guide_version: null, score: merged.score, strategy: "continuity-test", detail: { passed: merged.passed, defects: merged.defects } });
  return merged;
}

export async function runAudit(deps: Deps): Promise<{ findings: AuditFinding[]; scores: AuditSummary; resurrection: ResurrectionCheck; repaired?: BuildResult }> {
  const now = deps.now ?? Date.now; const t0 = now(); const cfgProblems = validateConfig(deps.config);
  if (cfgProblems.length) throw new Error(`Configuration is incomplete: ${cfgProblems.join("; ")}`);
  const sync = await syncSources(deps.storage, deps.sources, t0);
  let artifacts = await deps.storage.listArtifacts(deps.config.sourcePolicy.maxFiles + 500, true); let claims = await deps.storage.listClaims(10000);
  const affected = claimsAffectedBySources(claims, new Set([...sync.changedIds, ...sync.deletedIds]));
  for (const c of affected) await deps.storage.updateClaim(c.id, { stale: true, status: c.status === "confirmed" || c.status === "observed" ? "requires_audit" : c.status });
  claims = await deps.storage.listClaims(10000);
  const nexus = deps.models.length ? new Nexus(deps.models, deps.storage, now) : null;
  const raw = deterministicClaimAudit(claims, artifacts, deps.config, t0);
  if (nexus) raw.push(...await modelClaimAudit(nexus, deps.config, claims, artifacts, t0));
  const latest = await deps.storage.getLatestGuide(deps.config.preset);
  let modelScores: Partial<AuditSummary> = {};
  if (latest) {
    raw.push(...deterministicManualAudit(latest.sections, deps.config, t0));
    if (nexus) { const m = await modelManualAudit(nexus, deps.config, latest.sections, claims, t0); raw.push(...m.findings); modelScores = m.scores; }
  }
  await applyAuditDowngrades(deps.storage, claims, raw, false); claims = await deps.storage.listClaims(10000); artifacts = await deps.storage.listArtifacts(deps.config.sourcePolicy.maxFiles + 500, true);
  const findings = await persistFindings(deps.storage, raw, false);
  const resurrection = nexus ? mergeResurrection(deterministicResurrection(claims), await modelResurrection(nexus, claims)) : deterministicResurrection(claims);
  const required = sectionsForPreset(deps.config).length; const populated = new Set(claims.map((c) => c.section)).size;
  const scores = scoreAudit(claims, findings, Math.min(populated, required), required, resurrection.score, modelScores);
  await sealRun(deps.storage, { at: new Date(t0).toISOString(), outcome: "audited", reason: `Audit recorded ${findings.length} finding(s).`, model: nexus?.lastModel || null, source_count: artifacts.filter((a) => a.status === "active").length, claim_count: claims.length, finding_count: findings.length, guide_version: latest?.version ?? null, score: scores.truthfulness, strategy: "enterprise-audit", detail: { sync, resurrection: resurrection.score } });
  return { findings, scores, resurrection };
}

export { clampScore };
