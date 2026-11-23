/**
 * LivingChangelog receipts. The chain machinery is shared (core/receipts.ts);
 * this file only defines which fields of a LivingChangelog run are hashed.
 * Changing receiptPayload would invalidate every existing receipt: don't.
 */
import { createReceipts, GENESIS, iso, num, type ChainVerdict } from "../core/receipts.ts";
import type { Run, Storage } from "./ports.ts";

export { GENESIS, type ChainVerdict };

/** The exact object that is hashed. Same function at seal time and verify time. */
export function receiptPayload(run: Omit<Run, "receipt_hash" | "id">): Record<string, unknown> {
  return {
    at: iso(run.at),
    outcome: run.outcome,
    reason: run.reason,
    entry_title: run.entry_title ?? null,
    entry_slug: run.entry_slug ?? null,
    model: run.model ?? null,
    reader_score: num(run.reader_score),
    skeptic_score: num(run.skeptic_score),
    fitness: num(run.fitness),
    strategy: run.strategy ?? null,
    detail: run.detail ?? {},
    prev_hash: run.prev_hash,
  };
}

const chain = createReceipts<Run>(receiptPayload);
export const sealRun = (storage: Storage, run: Omit<Run, "receipt_hash" | "prev_hash" | "id">): Promise<Run> => chain.sealRun(storage, run);
export const verifyChain = (runsNewestFirst: Run[]): Promise<ChainVerdict> => chain.verifyChain(runsNewestFirst);
export const verifyStoredChain = (storage: Storage, pageSize = 1000): Promise<ChainVerdict> => chain.verifyStoredChain(storage, pageSize);
