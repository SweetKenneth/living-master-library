/** Cheap self-repair for the changelog state. No model calls. */

import type { LivingChangelogConfig } from "./config.ts";
import { deterministicIgnore } from "./evidence.ts";
import { demoteH1 } from "./markdown.ts";
import type { ChangelogEntry, Storage } from "./ports.ts";

export async function repair(storage: Storage, cfg: LivingChangelogConfig, nowMs: number): Promise<string[]> {
  const done: string[] = [];
  const pending = await storage.listEvidence("pending", cfg.sourcePolicy.maxPendingEvidence);
  for (const e of pending) {
    const reason = deterministicIgnore(e, cfg);
    if (reason) {
      await storage.updateEvidence(e.id, { status: "ignored", ignore_reason: reason });
      done.push(`ignored evidence ${e.source}/${e.external_id}: ${reason}`);
      continue;
    }
    const age = nowMs - Date.parse(e.occurred_at);
    if (e.attempts >= 12 && age > cfg.sourcePolicy.staleEvidenceDays * 86400_000) {
      await storage.updateEvidence(e.id, { status: "ignored", ignore_reason: `stale after ${e.attempts} holds` });
      done.push(`retired stale evidence ${e.source}/${e.external_id}`);
    }
  }

  const entries = await storage.listEntries(200);
  for (const entry of entries) {
    const body = demoteH1(entry.body);
    if (body !== entry.body) {
      const patch: Partial<ChangelogEntry> = { body };
      await storage.updateEntry(entry.id, patch);
      done.push(`demoted stray H1 in "${entry.slug}"`);
    }
  }
  return done;
}
