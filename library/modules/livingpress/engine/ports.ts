/**
 * LivingPress ports. The engine depends only on these shapes, never on a
 * vendor SDK. Adapters in ./adapters implement them with plain fetch().
  */

import type { KV } from "../core/types.ts";
export type { ChatMessage, ChatOptions, ModelProvider, KV, Clock } from "../core/types.ts";

export type Role = "pillar" | "support";
export type Advocacy = "implicit" | "explicit";
export type TickOutcome = "published" | "drafted" | "silent" | "blocked" | "error" | "audited" | "tripped" | "repaired";

export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  role: Role;
  cluster: string;
  pillar_slug: string | null;
  image_url: string;
  image_alt: string;
  advocacy: Advocacy;
  keywords: string[];
  caveats: string[];
  epistemic_status: string;
  reader_score: number;
  skeptic_score: number;
  fitness: number;
  published_at: string;
  last_audited_at: string | null;
  corrections: Correction[];
};

export type Correction = { at: string; note: string; changes: string[] };

export type Topic = {
  id: string;
  cluster: string;
  title: string;
  angle: string;
  role: Role;
  pain_point: string;
  keywords: string[];
  gravity: number;
  status: "queued" | "used" | "rejected";
  attempts: number;
};

export type Run = {
  id?: string;
  at: string;
  outcome: TickOutcome;
  reason: string;
  topic_title?: string | null;
  post_slug?: string | null;
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
  listPosts(limit: number): Promise<Post[]>;
  getPostBySlug(slug: string): Promise<Post | null>;
  insertPost(post: Omit<Post, "id">): Promise<Post>;
  updatePost(id: string, patch: Partial<Post>): Promise<void>;
  listTopics(status: Topic["status"], limit: number): Promise<Topic[]>;
  insertTopic(topic: Omit<Topic, "id">): Promise<boolean>;
  updateTopic(id: string, patch: Partial<Topic>): Promise<void>;
  listRuns(limit: number): Promise<Run[]>;
  insertRun(run: Run): Promise<void>;
  /** Small key/value table for breaker state, DREAM heuristics, rate buckets. */
  /** Optional paged run scan, newest first: lets /health verify receipts all the way to GENESIS. */
  listRunsPage?(limit: number, offset: number): Promise<Run[]>;
  getState<T = KV>(key: string): Promise<T | null>;
  setState(key: string, value: unknown): Promise<void>;
  /**
   * Optional atomic lease (one tick at a time). Return true if `owner` now holds
   * `name` until `untilMs`. Storages without it get a best-effort get/set lease.
   */
  tryLease?(name: string, owner: string, untilMs: number, nowMs: number): Promise<boolean>;
  releaseLease?(name: string, owner: string): Promise<void>;
}



/** Image port. Every post gets an image — no image, no post. */
export interface ImageProvider {
  /** Returns a public URL (generated, stock, or picked from the site's own library). */
  imageFor(input: { title: string; keywords: string[]; recentlyUsed: string[] }): Promise<{ url: string; alt: string }>;
}

