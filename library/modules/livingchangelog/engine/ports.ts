/**
 * LivingChangelog ports. The engine depends on shapes, not vendor SDKs.
 * Adapters use plain fetch so the engine stays portable.
 */

import type { KV } from "../core/types.ts";
export type { ChatMessage, ChatOptions, ModelProvider, KV, Clock } from "../core/types.ts";

export type EntryRole = "update" | "release";
export type ChangeCategory = "added" | "improved" | "fixed" | "changed" | "removed" | "security" | "developer";
export type EvidenceKind = "commit" | "pull_request" | "release" | "deployment" | "issue" | "manual";
export type EvidenceStatus = "pending" | "used" | "ignored";
export type TickOutcome = "published" | "drafted" | "silent" | "blocked" | "error" | "audited" | "tripped" | "repaired";

export type Correction = { at: string; note: string; changes: string[] };

export type ChangelogEntry = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  role: EntryRole;
  version: string | null;
  categories: ChangeCategory[];
  evidence_ids: string[];
  evidence_urls: string[];
  audience: string[];
  caveats: string[];
  epistemic_status: string;
  reader_score: number;
  skeptic_score: number;
  fitness: number;
  published_at: string;
  last_audited_at: string | null;
  corrections: Correction[];
};

export type ChangeEvidence = {
  id: string;
  source: string;
  external_id: string;
  kind: EvidenceKind;
  title: string;
  summary: string;
  url: string | null;
  author: string | null;
  labels: string[];
  occurred_at: string;
  ingested_at: string;
  status: EvidenceStatus;
  attempts: number;
  ignore_reason: string | null;
  metadata: Record<string, unknown>;
};

export type EvidenceInput = Omit<ChangeEvidence, "id" | "ingested_at" | "status" | "attempts" | "ignore_reason"> & {
  occurred_at?: string;
};

export type Run = {
  id?: string;
  at: string;
  outcome: TickOutcome;
  reason: string;
  entry_title?: string | null;
  entry_slug?: string | null;
  model?: string | null;
  reader_score?: number | null;
  skeptic_score?: number | null;
  fitness?: number | null;
  strategy?: string | null;
  receipt_hash: string;
  prev_hash: string;
  detail: Record<string, unknown>;
};


/** Storage port. Any database works if it can do these. */
export interface Storage {
  listEntries(limit: number): Promise<ChangelogEntry[]>;
  getEntryBySlug(slug: string): Promise<ChangelogEntry | null>;
  insertEntry(entry: Omit<ChangelogEntry, "id">): Promise<ChangelogEntry>;
  updateEntry(id: string, patch: Partial<ChangelogEntry>): Promise<void>;

  /** Oldest first by default (work queue order). Pass newestFirst for "recent" views. */
  listEvidence(status: EvidenceStatus, limit: number, newestFirst?: boolean): Promise<ChangeEvidence[]>;
  getEvidenceByIds(ids: string[]): Promise<ChangeEvidence[]>;
  insertEvidence(evidence: EvidenceInput): Promise<boolean>;
  updateEvidence(id: string, patch: Partial<ChangeEvidence>): Promise<void>;

  listRuns(limit: number): Promise<Run[]>;
  /** Optional paged run scan, newest first. Enables full-history receipt verification. */
  listRunsPage?(limit: number, offset: number): Promise<Run[]>;
  insertRun(run: Run): Promise<void>;

  getState<T = KV>(key: string): Promise<T | null>;
  setState(key: string, value: unknown): Promise<void>;
  incrementRateBucket?(surface: "public" | "admin", signature: string, minute: number): Promise<number>;
  tryLease?(name: string, owner: string, untilMs: number, nowMs: number): Promise<boolean>;
  releaseLease?(name: string, owner: string): Promise<void>;
}



/** Pulls immutable evidence from an external system. The storage adapter deduplicates it. */
export interface EvidenceSource {
  id: string;
  pull(sinceMs: number, nowMs: number): Promise<EvidenceInput[]>;
  /** Non-fatal source warnings from the most recent pull (e.g. optional API scope missing). */
  warnings?(): string[];
}


/** A post about one published entry. `text` is final and already fitted to the channel. */
export type Announcement = { text: string; url: string; title: string; excerpt: string; version: string | null; slug: string };

/** A place to announce published entries: Bluesky, Mastodon, X, Discord, Slack, a webhook. */
export interface Announcer {
  id: string;
  /** Character limit of a post on this channel. */
  maxChars: number;
  /** How many characters a link counts as (X and Mastodon count every link as 23). Omit to count it literally. */
  urlCost?: number;
  post(a: Announcement): Promise<{ url?: string | null }>;
}
