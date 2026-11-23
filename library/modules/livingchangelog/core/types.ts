/**
 * livingcore types. The smallest shapes the shared modules need, so any
 * product's Storage satisfies them structurally without importing them.
 */

export type KV = Record<string, unknown>;

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type ChatOptions = { maxTokens?: number; temperature?: number; json?: boolean };

/** One model endpoint. NEXUS strings several of these into a failover ladder. */
export interface ModelProvider {
  id: string;
  chat(messages: ChatMessage[], opts: ChatOptions): Promise<string>;
}

/** Small key/value state: breaker, NEXUS bench, rate windows, leases. */
export interface StateStore {
  getState<T = KV>(key: string): Promise<T | null>;
  setState(key: string, value: unknown): Promise<void>;
}

/** Optional atomic operations a durable store can add (Postgres functions in each product's schema.sql). */
export interface AtomicStore extends StateStore {
  incrementRateBucket?(surface: "public" | "admin", signature: string, minute: number): Promise<number>;
  tryLease?(name: string, owner: string, untilMs: number, nowMs: number): Promise<boolean>;
  releaseLease?(name: string, owner: string): Promise<void>;
}

export type Clock = () => number;
