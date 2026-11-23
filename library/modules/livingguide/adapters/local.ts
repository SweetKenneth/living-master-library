/** Local repository/project scanner. Sensitive files are skipped; likely secrets in readable text are redacted before storage/model context. */
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join, relative, resolve } from "node:path";
import { sha256 } from "../core/oracle.ts";
import type { LivingGuideConfig } from "../engine/config.ts";
import type { ArtifactInput, ArtifactKind, ProjectSource } from "../engine/ports.ts";

const REDACTIONS: Array<[RegExp, string]> = [
  [/\bsk-[A-Za-z0-9_-]{16,}\b/g, "[REDACTED_OPENAI_STYLE_KEY]"],
  [/\bgh[pousr]_[A-Za-z0-9_]{16,}\b/g, "[REDACTED_GITHUB_TOKEN]"],
  [/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED_AWS_ACCESS_KEY]"],
  [/(-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)[\s\S]*?(-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/g, "$1\n[REDACTED_PRIVATE_KEY]\n$2"],
  [/((?:password|passwd|api[_ -]?key|secret|token)\s*[:=]\s*["']?)[^\s"']{12,}/gi, "$1[REDACTED_SECRET]"],
];

export function redactSecrets(text: string): { text: string; redactions: number } {
  let redactions = 0; let out = text;
  for (const [r, replacement] of REDACTIONS) out = out.replace(r, () => { redactions += 1; return replacement; });
  return { text: out, redactions };
}

function kindFor(path: string): ArtifactKind {
  const p = path.toLowerCase(); const e = extname(p);
  if (/\b(test|tests|spec|__tests__)\b/.test(p) || /\.(test|spec)\.[^.]+$/.test(p)) return "test";
  if (e === ".sql" || /schema/.test(basename(p))) return "schema";
  if ([".md", ".mdx", ".txt"].includes(e) || /readme|changelog|contributing|guide|manual/.test(basename(p))) return "documentation";
  if ([".json", ".yaml", ".yml", ".toml", ".ini"].includes(e) || /config/.test(basename(p))) return "configuration";
  if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".go", ".rs", ".java", ".kt", ".cs", ".rb", ".php", ".sh", ".ps1"].includes(e)) return "source_code";
  if ([".html", ".css", ".scss", ".xml"].includes(e)) return "asset";
  return "note";
}

const langFor = (e: string) => ({ ".ts": "typescript", ".tsx": "tsx", ".js": "javascript", ".jsx": "jsx", ".py": "python", ".go": "go", ".rs": "rust", ".java": "java", ".kt": "kotlin", ".cs": "csharp", ".rb": "ruby", ".php": "php", ".sql": "sql", ".md": "markdown", ".mdx": "mdx", ".json": "json", ".yaml": "yaml", ".yml": "yaml", ".html": "html", ".css": "css", ".scss": "scss", ".sh": "shell" } as Record<string, string>)[e] ?? null;

export function localProjectSource(rootInput: string, cfg: LivingGuideConfig): ProjectSource {
  const root = resolve(rootInput); const warnings: string[] = [];
  const sensitive = cfg.sourcePolicy.sensitiveNamePatterns.map((p) => new RegExp(p, "i"));
  const excludedDirs = new Set(cfg.sourcePolicy.excludeDirectories); const excludedFiles = new Set(cfg.sourcePolicy.excludeFiles);
  const includeExt = new Set(cfg.sourcePolicy.includeExtensions.map((x) => x.toLowerCase()));
  return {
    id: "local-fs",
    async scan(nowMs) {
      const paths: string[] = [];
      async function walk(dir: string) {
        if (paths.length >= cfg.sourcePolicy.maxFiles) return;
        const entries = await readdir(dir, { withFileTypes: true });
        entries.sort((a, b) => a.name.localeCompare(b.name));
        for (const ent of entries) {
          if (paths.length >= cfg.sourcePolicy.maxFiles) break;
          const full = join(dir, ent.name); const rel = relative(root, full).replace(/\\/g, "/");
          if (ent.isDirectory()) { if (!excludedDirs.has(ent.name) && ent.name !== ".livingguide" && ent.name !== ".living") await walk(full); continue; }
          if (!ent.isFile() || excludedFiles.has(ent.name) || sensitive.some((r) => r.test(ent.name) || r.test(rel))) continue;
          const ext = extname(ent.name).toLowerCase();
          if (!includeExt.has(ext) && ent.name !== "Dockerfile" && ent.name !== "Makefile") continue;
          paths.push(full);
        }
      }
      await walk(root);
      if (paths.length >= cfg.sourcePolicy.maxFiles) warnings.push(`scan reached maxFiles=${cfg.sourcePolicy.maxFiles}; source inventory may be incomplete`);
      const out: ArtifactInput[] = [];
      for (const full of paths) {
        const s = await stat(full); const rel = relative(root, full).replace(/\\/g, "/");
        if (s.size > cfg.sourcePolicy.maxFileBytes) { warnings.push(`skipped ${rel}: ${s.size} bytes exceeds maxFileBytes`); continue; }
        const buf = await readFile(full); if ((buf as Uint8Array).some?.((b: number) => b === 0)) { warnings.push(`skipped binary-looking file ${rel}`); continue; }
        const raw = typeof buf === "string" ? buf : new TextDecoder().decode(buf as Uint8Array);
        const redacted = redactSecrets(raw);
        const excerpt = redacted.text.slice(0, cfg.sourcePolicy.maxExcerptChars);
        out.push({ source: "local-fs", external_id: rel, kind: kindFor(rel), path: rel, title: basename(rel), content_excerpt: excerpt, content_hash: await sha256(redacted.text), bytes: s.size, language: langFor(extname(rel).toLowerCase()), observed_at: new Date(Number(s.mtimeMs) || nowMs).toISOString(), metadata: { mtime_ms: Number(s.mtimeMs), truncated: redacted.text.length > excerpt.length, redactions: redacted.redactions } });
      }
      return out;
    },
    warnings: () => [...warnings],
  };
}
