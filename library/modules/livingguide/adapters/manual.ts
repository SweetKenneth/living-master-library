/** Programmatic source for creator notes, exported chats, research notes or other pre-extracted text. */
import { sha256 } from "../core/oracle.ts";
import type { ArtifactKind, ProjectSource } from "../engine/ports.ts";
import { redactSecrets } from "./local.ts";

export type ManualSourceItem = { id: string; title: string; text: string; kind?: ArtifactKind; path?: string; observedAt?: string; metadata?: Record<string, unknown> };
export function manualSource(id: string, items: ManualSourceItem[]): ProjectSource {
  return {
    id,
    async scan(nowMs) {
      const out = [];
      for (const item of items) {
        const safe = redactSecrets(item.text);
        out.push({ source: id, external_id: item.id, kind: item.kind ?? "note" as const, path: item.path ?? item.title, title: item.title, content_excerpt: safe.text, content_hash: await sha256(safe.text), bytes: new TextEncoder().encode(item.text).byteLength, language: null, observed_at: item.observedAt ?? new Date(nowMs).toISOString(), metadata: { ...(item.metadata ?? {}), redactions: safe.redactions } });
      }
      return out;
    },
  };
}
