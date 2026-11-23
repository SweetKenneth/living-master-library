/** Durable zero-dependency JSON storage for local projects. Writes atomically via temp+rename. */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { memoryStorage } from "./memory.ts";
import type { AuditFinding, CanonicalGuide, Run, SourceArtifact, Storage, TruthClaim } from "../engine/ports.ts";

type FileShape = { version: 1; artifacts: SourceArtifact[]; claims: TruthClaim[]; guides: CanonicalGuide[]; findings: AuditFinding[]; runs: Run[]; state: Record<string, unknown> };
const EMPTY: FileShape = { version: 1, artifacts: [], claims: [], guides: [], findings: [], runs: [], state: {} };

export async function jsonStorage(file: string): Promise<Storage & { flush(): Promise<void>; path: string }> {
  let seed = structuredClone(EMPTY);
  try { const parsed = JSON.parse(await readFile(file, "utf8")) as Partial<FileShape>; if (parsed && parsed.version === 1) seed = { ...structuredClone(EMPTY), ...parsed } as FileShape; } catch { /* first run */ }
  const mem = memoryStorage({ artifacts: seed.artifacts, claims: seed.claims, guides: seed.guides, findings: seed.findings, runs: seed.runs });
  for (const [k, v] of Object.entries(seed.state ?? {})) await mem.setState(k, v);
  let dirty = false;
  async function flush() {
    if (!dirty) return;
    const dump = mem.dump() as Omit<FileShape, "version">;
    await mkdir(dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    await writeFile(tmp, `${JSON.stringify({ version: 1, ...dump }, null, 2)}\n`, "utf8");
    await rename(tmp, file); dirty = false;
  }
  const wrap = new Proxy(mem as Storage, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      if (["listArtifacts", "getArtifactByExternalId", "listClaims", "getClaimsBySection", "getClaimByKey", "listGuides", "getLatestGuide", "listFindings", "listRuns", "listRunsPage", "getState"].includes(String(prop))) return value.bind(target);
      return async (...args: unknown[]) => { const r = await value.apply(target, args); dirty = true; await flush(); return r; };
    },
  }) as Storage;
  return Object.assign(wrap, { flush, path: file });
}
