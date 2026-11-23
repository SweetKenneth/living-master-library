import { createReceipts } from "../core/receipts.ts";
import type { RoadmapRun } from "./types.ts";
const payload = (r: Omit<RoadmapRun,"receipt_hash"|"id">) => ({ at:r.at,outcome:r.outcome,reason:r.reason,item_count:r.item_count,finding_count:r.finding_count,prev_hash:r.prev_hash,detail:r.detail });
export const { sealRun, verifyChain, verifyStoredChain } = createReceipts<RoadmapRun>(payload);
