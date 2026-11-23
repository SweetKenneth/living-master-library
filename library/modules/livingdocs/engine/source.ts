/** Source synchronization: immutable-ish artifacts become the evidence layer beneath claims. */

import type { ArtifactInput, ProjectSource, SourceArtifact, Storage } from "./ports.ts";

export type SyncReport = {
  inserted: number;
  changed: number;
  unchanged: number;
  deleted: number;
  changedIds: string[];
  deletedIds: string[];
  activeIds: string[];
  errors: string[];
  warnings: string[];
};

export async function syncSources(storage: Storage, sources: ProjectSource[], nowMs: number): Promise<SyncReport> {
  const report: SyncReport = { inserted: 0, changed: 0, unchanged: 0, deleted: 0, changedIds: [], deletedIds: [], activeIds: [], errors: [], warnings: [] };
  const observedAt = new Date(nowMs).toISOString();
  for (const source of sources) {
    try {
      const items = await source.scan(nowMs);
      const ids: string[] = [];
      for (const item of items) {
        const row = await storage.upsertArtifact(item);
        ids.push(item.external_id);
        report.activeIds.push(row.artifact.id);
        if (row.change === "inserted") { report.inserted += 1; report.changedIds.push(row.artifact.id); }
        else if (row.change === "changed") { report.changed += 1; report.changedIds.push(row.artifact.id); }
        else report.unchanged += 1;
      }
      const deleted = await storage.markArtifactsDeleted(source.id, ids, observedAt);
      report.deleted += deleted.length; report.deletedIds.push(...deleted);
      report.warnings.push(...(source.warnings?.() ?? []).map((x) => `${source.id}: ${x}`));
    } catch (err) {
      report.errors.push(`${source.id}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 700));
    }
  }
  report.changedIds = [...new Set(report.changedIds)];
  report.deletedIds = [...new Set(report.deletedIds)];
  report.activeIds = [...new Set(report.activeIds)];
  return report;
}

export function artifactBlock(artifacts: SourceArtifact[]): string {
  return artifacts.map((a) => `SOURCE_ID: ${a.id}\nPATH: ${a.path}\nKIND: ${a.kind}\nHASH: ${a.content_hash}\nCONTENT:\n${a.content_excerpt}`).join("\n\n--- SOURCE ---\n\n");
}

export function artifactInventory(artifacts: SourceArtifact[]): { total: number; byKind: Record<string, number>; bytes: number } {
  const byKind: Record<string, number> = {};
  let bytes = 0;
  for (const a of artifacts.filter((x) => x.status === "active")) { byKind[a.kind] = (byKind[a.kind] ?? 0) + 1; bytes += Number(a.bytes || 0); }
  return { total: Object.values(byKind).reduce((a, b) => a + b, 0), byKind, bytes };
}
