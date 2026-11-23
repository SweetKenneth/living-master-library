/** LivingGuide ports: evidence, claims, canonical guides, findings and sealed runs. */

import type { KV } from "../core/types.ts";
export type { ChatMessage, ChatOptions, ModelProvider, KV, Clock } from "../core/types.ts";

export type TruthStatus =
  | "confirmed"
  | "observed"
  | "inferred"
  | "planned"
  | "speculative"
  | "unknown"
  | "needs_confirmation"
  | "requires_audit";

export type ArtifactKind =
  | "source_code"
  | "documentation"
  | "configuration"
  | "test"
  | "schema"
  | "history"
  | "asset"
  | "note"
  | "manual";

export type ArtifactStatus = "active" | "deleted";
export type FindingSeverity = "info" | "warning" | "critical";
export type FindingStatus = "open" | "resolved";
export type GuidePreset = "founder" | "engineering" | "operator" | "acquisition" | "custom";

export type SectionId =
  | "executive-summary"
  | "canonical-identity"
  | "project-classification"
  | "core-concept"
  | "feature-inventory"
  | "architecture-analysis"
  | "strategic-ecosystem-role"
  | "development-history"
  | "current-state-assessment"
  | "monetization-analysis"
  | "competitive-positioning"
  | "future-vision"
  | "priority-roadmap"
  | "risk-analysis"
  | "preservation-continuity"
  | "strategic-importance-ranking"
  | "recommended-next-actions"
  | "canonical-summary";

export type ArtifactInput = {
  source: string;
  external_id: string;
  kind: ArtifactKind;
  path: string;
  title: string;
  content_excerpt: string;
  content_hash: string;
  bytes: number;
  language: string | null;
  observed_at: string;
  metadata: Record<string, unknown>;
};

export type SourceArtifact = ArtifactInput & {
  id: string;
  ingested_at: string;
  status: ArtifactStatus;
};

export type ClaimSourceRef = {
  source_id: string;
  /** Short verbatim support from the ingested artifact. It must actually exist in the stored excerpt. */
  quote: string;
  note?: string;
};

export type TruthClaim = {
  id: string;
  claim_key: string;
  section: SectionId;
  statement: string;
  status: TruthStatus;
  confidence: number;
  sources: ClaimSourceRef[];
  basis: "project_file" | "creator_context" | "external_research" | "strategic_inference" | "unknown";
  tags: string[];
  first_seen_at: string;
  last_verified_at: string;
  stale: boolean;
  requires_confirmation: boolean;
  contradictions: string[];
  metadata: Record<string, unknown>;
};

export type GuideSection = { id: SectionId; title: string; markdown: string; claim_ids: string[] };
export type AuditSummary = {
  truthfulness: number;
  completeness: number;
  continuity_readiness: number;
  enterprise_polish: number;
  readability: number;
  technical_clarity: number;
  strategic_clarity: number;
  future_maintainability: number;
  acquisition_readiness: number;
  archival_quality: number;
};

export type ResurrectionCheck = {
  score: number;
  passed: boolean;
  answerable: string[];
  defects: string[];
  notes: string[];
};

export type CanonicalGuide = {
  id: string;
  version: number;
  preset: GuidePreset;
  title: string;
  markdown: string;
  html: string;
  generated_at: string;
  source_ids: string[];
  claim_ids: string[];
  sections: GuideSection[];
  audit_summary: AuditSummary;
  resurrection: ResurrectionCheck;
  metadata: Record<string, unknown>;
};

export type AuditFinding = {
  id: string;
  at: string;
  severity: FindingSeverity;
  kind: string;
  message: string;
  recommendation: string;
  claim_ids: string[];
  source_ids: string[];
  status: FindingStatus;
  metadata: Record<string, unknown>;
};

export type RunOutcome = "generated" | "audited" | "resurrection" | "reconciled" | "silent" | "blocked" | "error" | "tripped";
export type Run = {
  id?: string;
  at: string;
  outcome: RunOutcome;
  reason: string;
  model?: string | null;
  source_count?: number | null;
  claim_count?: number | null;
  finding_count?: number | null;
  guide_version?: number | null;
  score?: number | null;
  strategy?: string | null;
  receipt_hash: string;
  prev_hash: string;
  detail: Record<string, unknown>;
};

export interface Storage {
  listArtifacts(limit: number, includeDeleted?: boolean): Promise<SourceArtifact[]>;
  getArtifactByExternalId(source: string, externalId: string): Promise<SourceArtifact | null>;
  upsertArtifact(input: ArtifactInput): Promise<{ artifact: SourceArtifact; change: "inserted" | "changed" | "unchanged" }>;
  markArtifactsDeleted(source: string, activeExternalIds: string[], observedAt: string): Promise<string[]>;

  listClaims(limit: number): Promise<TruthClaim[]>;
  getClaimsBySection(section: SectionId): Promise<TruthClaim[]>;
  getClaimByKey(key: string): Promise<TruthClaim | null>;
  upsertClaim(claim: Omit<TruthClaim, "id">): Promise<TruthClaim>;
  updateClaim(id: string, patch: Partial<TruthClaim>): Promise<void>;

  listGuides(limit: number): Promise<CanonicalGuide[]>;
  getLatestGuide(preset?: GuidePreset): Promise<CanonicalGuide | null>;
  insertGuide(guide: Omit<CanonicalGuide, "id">): Promise<CanonicalGuide>;

  listFindings(limit: number, status?: FindingStatus): Promise<AuditFinding[]>;
  insertFinding(finding: Omit<AuditFinding, "id">): Promise<AuditFinding>;
  updateFinding(id: string, patch: Partial<AuditFinding>): Promise<void>;

  listRuns(limit: number): Promise<Run[]>;
  listRunsPage?(limit: number, offset: number): Promise<Run[]>;
  insertRun(run: Run): Promise<void>;

  getState<T = KV>(key: string): Promise<T | null>;
  setState(key: string, value: unknown): Promise<void>;
  incrementRateBucket?(surface: "public" | "admin", signature: string, minute: number): Promise<number>;
  tryLease?(name: string, owner: string, untilMs: number, nowMs: number): Promise<boolean>;
  releaseLease?(name: string, owner: string): Promise<void>;
}

export interface ProjectSource {
  id: string;
  scan(nowMs: number): Promise<ArtifactInput[]>;
  warnings?(): string[];
}
