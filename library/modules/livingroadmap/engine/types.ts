export type RoadmapStatus = "planned" | "active" | "blocked" | "shipped" | "abandoned" | "superseded" | "needs_confirmation";
export type Priority = "critical" | "high" | "medium" | "low";
export type EvidenceKind = "source_code" | "test" | "configuration" | "schema" | "documentation" | "release" | "deployment" | "commit" | "history" | "note";
export type EvidenceArtifact = {
  id: string; source: string; external_id: string; kind: EvidenceKind; path: string; title: string;
  content_excerpt: string; content_hash: string; bytes: number; observed_at: string; status: "active" | "deleted";
  metadata: Record<string, unknown>;
};
export type EvidenceRef = { artifact_id: string; kind: EvidenceKind; path: string; quote: string; score: number; signal: "implementation" | "shipping" | "context" };
export type DecisionEvent = { at: string; from?: RoadmapStatus; to?: RoadmapStatus; reason: string; evidence_ids: string[]; actor: "human" | "system" };
export type RoadmapItem = {
  id: string; title: string; intent: string; why: string; status: RoadmapStatus; priority: Priority;
  expected_value: number; effort: number; creator_energy: number; revenue_proximity: number; dependency_risk: number;
  dependencies: string[]; blocks: string[]; created_at: string; last_touched: string; target_window: string | null;
  evidence: EvidenceRef[]; ship_candidate: boolean; implementation_candidate: boolean; requires_confirmation: boolean;
  decision_history: DecisionEvent[]; superseded_by: string | null; shipped_as: string | null; tags: string[];
};
export type FindingSeverity = "info" | "warning" | "critical";
export type RoadmapFinding = { id: string; at: string; severity: FindingSeverity; kind: string; message: string; item_ids: string[]; artifact_ids: string[]; recommendation: string; status: "open" | "resolved" };
export type RoadmapRun = { id?: string; at: string; outcome: "scan" | "reconcile" | "audit" | "build" | "confirm" | "add" | "error"; reason: string; item_count: number; finding_count: number; receipt_hash: string; prev_hash: string; detail: Record<string, unknown> };
export type RoadmapState = { version: 1; items: RoadmapItem[]; artifacts: EvidenceArtifact[]; findings: RoadmapFinding[]; runs: RoadmapRun[]; meta: Record<string, unknown> };
export type ReconcileItem = { item_id: string; title: string; implementation_candidate: boolean; ship_candidate: boolean; recommended_status: RoadmapStatus | null; evidence: EvidenceRef[]; reason: string };
export type RoadmapAudit = { generated_at: string; drift_score: number; stale_items: string[]; blocked_items: string[]; ship_candidates: string[]; implementation_candidates: string[]; dependency_issues: string[]; duplicate_pairs: Array<[string,string]>; unplanned_signals: EvidenceRef[]; findings: RoadmapFinding[] };
