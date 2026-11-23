/** LivingGuide sealed-run receipt definition. Changing this payload invalidates existing receipts. */
import { createReceipts, GENESIS, iso, num, type ChainVerdict } from "../core/receipts.ts";
import type { Run, Storage } from "./ports.ts";
export { GENESIS, type ChainVerdict };
export function receiptPayload(run: Omit<Run, "receipt_hash" | "id">): Record<string, unknown> {
  return {
    at: iso(run.at), outcome: run.outcome, reason: run.reason, model: run.model ?? null,
    source_count: num(run.source_count), claim_count: num(run.claim_count), finding_count: num(run.finding_count),
    guide_version: num(run.guide_version), score: num(run.score), strategy: run.strategy ?? null,
    detail: run.detail ?? {}, prev_hash: run.prev_hash,
  };
}
const chain = createReceipts<Run>(receiptPayload);
export const sealRun = (storage: Storage, run: Omit<Run, "receipt_hash" | "prev_hash" | "id">): Promise<Run> => chain.sealRun(storage, run);
export const verifyChain = (runsNewestFirst: Run[]): Promise<ChainVerdict> => chain.verifyChain(runsNewestFirst);
export const verifyStoredChain = (storage: Storage, pageSize = 1000): Promise<ChainVerdict> => chain.verifyStoredChain(storage, pageSize);
