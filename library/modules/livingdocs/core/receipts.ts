/**
 * Sealed run receipts, generic over each product's run row.
 *
 * Every tick writes one row whose hash covers its content and the previous
 * row's hash. Editing, deleting or forking history breaks verification.
 *
 * Each product supplies `payload`: the exact object that is hashed for its
 * row shape. The same function runs at seal time and at verify time, so a
 * product's existing receipts keep verifying when it moves onto the core.
 *
 * Use `iso()` and `num()` inside payload functions: Postgres returns
 * `2026-01-01T00:00:00+00:00` instead of `...000Z`, and may return numerics as
 * strings. Normalizing both sides is what lets a row survive the round trip.
 */
import { canonical, sha256 } from "./oracle.ts";

export const GENESIS = "0".repeat(64);

export const iso = (v: unknown): string => {
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? new Date(t).toISOString() : String(v);
};
export const num = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number(v));

export type SealedRow = { at: string; receipt_hash: string; prev_hash: string; id?: string };
export type ReceiptStore<R extends SealedRow> = {
  listRuns(limit: number): Promise<R[]>;
  insertRun(run: R): Promise<void>;
  /** Optional paged scan, newest first. Enables verification all the way to GENESIS. */
  listRunsPage?(limit: number, offset: number): Promise<R[]>;
};
export type ChainVerdict = { valid: boolean; brokenAt?: string; checked: number; complete?: boolean; unstable?: boolean };

const isConflict = (e: unknown) => /\b(409|23505|duplicate|conflict|unique)\b/i.test(e instanceof Error ? e.message : String(e));

export function createReceipts<R extends SealedRow>(payload: (row: Omit<R, "receipt_hash" | "id">) => Record<string, unknown>) {
  type Unsealed = Omit<R, "receipt_hash" | "prev_hash" | "id">;

  async function sealRun(store: ReceiptStore<R>, run: Unsealed): Promise<R> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const [last] = await store.listRuns(1);
      const prev_hash = last?.receipt_hash ?? GENESIS;
      const row = { ...run, at: iso((run as unknown as SealedRow).at), prev_hash } as unknown as Omit<R, "receipt_hash" | "id">;
      const receipt_hash = await sha256(canonical(payload(row)));
      const sealed = { ...row, receipt_hash } as unknown as R;
      try {
        await store.insertRun(sealed);
        return sealed;
      } catch (e) {
        lastError = e;
        if (!isConflict(e)) throw e; // a real storage failure, not a race: the unique prev_hash index refused a fork
      }
    }
    throw lastError instanceof Error ? lastError : new Error("could not seal run");
  }

  /** Runs newest-first in, verdict out. Verifies the window it is given. */
  async function verifyChain(runsNewestFirst: R[]): Promise<ChainVerdict> {
    const runs = [...runsNewestFirst].reverse();
    let prev = runs[0]?.prev_hash ?? GENESIS;
    for (const r of runs) {
      if (r.prev_hash !== prev) return { valid: false, brokenAt: r.at, checked: runs.length };
      const { receipt_hash: _h, id: _id, ...rest } = r;
      const expect = await sha256(canonical(payload(rest as unknown as Omit<R, "receipt_hash" | "id">)));
      if (expect !== r.receipt_hash) return { valid: false, brokenAt: r.at, checked: runs.length };
      prev = r.receipt_hash;
    }
    return { valid: true, checked: runs.length };
  }

  /**
   * Verify every stored receipt. Paged stores are scanned to GENESIS; rows can
   * be appended mid-scan, so the tip is sampled before and after and the scan
   * retries if it moved. Stores without paging verify the newest window.
   */
  async function verifyStoredChain(store: ReceiptStore<R>, pageSize = 1000): Promise<ChainVerdict> {
    const size = Math.max(1, Math.min(1000, Math.floor(pageSize)));
    if (!store.listRunsPage) {
      const runs = await store.listRuns(size);
      return { ...(await verifyChain(runs)), complete: runs.length < size };
    }
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const tipBefore = (await store.listRuns(1))[0]?.receipt_hash ?? GENESIS;
      const all: R[] = [];
      for (let offset = 0; ; offset += size) {
        const page = await store.listRunsPage(size, offset);
        all.push(...page);
        if (page.length < size) break;
      }
      const tipAfter = (await store.listRuns(1))[0]?.receipt_hash ?? GENESIS;
      if (tipBefore !== tipAfter) continue;
      const verdict = await verifyChain(all);
      if (!verdict.valid) return { ...verdict, complete: true };
      const oldest = all[all.length - 1];
      if (oldest && oldest.prev_hash !== GENESIS) return { valid: false, brokenAt: oldest.at, checked: all.length, complete: true };
      return { ...verdict, complete: true };
    }
    return { valid: false, checked: 0, complete: false, unstable: true };
  }

  return { sealRun, verifyChain, verifyStoredChain };
}
