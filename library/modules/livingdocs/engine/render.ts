/** Canonical documentation Markdown + premium PDF-ready HTML renderer. */

import { renderMarkdown } from "../core/markdown.ts";
import type { LivingDocsConfig } from "./config.ts";
import { SECTION_TITLES } from "./config.ts";
import type { AuditFinding, AuditSummary, GuideSection, VerificationCheck, SourceArtifact, TruthClaim } from "./ports.ts";
import { verificationMarkdown } from "./verification.ts";

export function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export function canonicalMarkdown(input: {
  cfg: LivingDocsConfig; sections: GuideSection[]; claims: TruthClaim[]; artifacts: SourceArtifact[];
  findings: AuditFinding[]; audit: AuditSummary; verification: VerificationCheck; generatedAt: string; version: number;
}): string {
  const { cfg, sections, claims, artifacts, findings, audit, verification: verification, generatedAt, version } = input;
  const active = artifacts.filter((a) => a.status === "active");
  const unresolved = claims.filter((c) => c.status === "unknown" || c.status === "needs_confirmation" || c.status === "requires_audit" || c.stale);
  const toc = sections.map((s) => `- [${SECTION_TITLES[s.id]}](#${slugify(SECTION_TITLES[s.id])})`).join("\n");
  const statusCounts = claims.reduce<Record<string, number>>((m, c) => ((m[c.status] = (m[c.status] ?? 0) + 1), m), {});
  const sourceKinds = active.reduce<Record<string, number>>((m, a) => ((m[a.kind] = (m[a.kind] ?? 0) + 1), m), {});
  const open = findings.filter((f) => f.status === "open");
  const scoreRows = Object.entries(audit).map(([k, v]) => `| ${k.replace(/_/g, " ")} | ${v}/100 |`).join("\n");
  const inventory = cfg.generation.includeSourceInventory ? `\n## Evidence Inventory\n\nThis edition was derived from **${active.length} active source artifacts** and **${claims.length} documentation claims**. Existing documentation is treated as one evidence class; implementation behavior requires implementation evidence.\n\n| Evidence kind | Count |\n|---|---:|\n${Object.entries(sourceKinds).sort().map(([k, v]) => `| ${k} | ${v} |`).join("\n") || "| none | 0 |"}\n\n### Claim Status Ledger\n\n| Status | Count |\n|---|---:|\n${Object.entries(statusCounts).sort().map(([k, v]) => `| ${k.replace(/_/g, " ")} | ${v} |`).join("\n") || "| none | 0 |"}\n` : "";
  const gaps = cfg.generation.includeUnknowns ? `\n## Unverified / Drift Queue\n\n${unresolved.length ? unresolved.slice(0, 120).map((c) => `- **${c.status.replace(/_/g, " ")}** — ${c.statement}`).join("\n") : "No unresolved claims are currently recorded. This does not prove the source inventory is complete."}\n` : "";
  const auditBlock = `\n## Documentation Health Snapshot\n\n| Dimension | Score |\n|---|---:|\n${scoreRows}\n\nOpen findings: **${open.length}** (${open.filter((f) => f.severity === "critical").length} critical, ${open.filter((f) => f.severity === "warning").length} warning).\n`;
  return `# ${cfg.project.name} — Living Documentation\n\n**Documentation edition:** v${version}  \n**Generated:** ${generatedAt}  \n**Preset:** ${cfg.preset}  \n${cfg.project.repository ? `**Repository:** ${cfg.project.repository}  \n` : ""}${cfg.project.docsBaseUrl ? `**Docs:** ${cfg.project.docsBaseUrl}  \n` : ""}\n> LivingDocs treats documentation as a maintained projection of evidence. When code, schema, configuration, tests, or interfaces change, dependent claims become stale until they are re-verified. Unknowns and contradictions remain visible instead of being smoothed over.\n\n## Table of Contents\n\n${toc}\n\n${sections.map((s) => s.markdown.trim()).join("\n\n")}\n${inventory}${gaps}${auditBlock}${cfg.generation.includeVerificationReport ? `\n${verificationMarkdown(verification).replace(/^# Documentation Verification/m, "## Documentation Verification")}` : ""}`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function addHeadingIds(html: string): string {
  return html.replace(/<h([2-6])>(.*?)<\/h\1>/g, (_m, n: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, ""); return `<h${n} id="${slugify(text)}">${inner}</h${n}>`;
  });
}

export function canonicalHtml(markdown: string, cfg: LivingDocsConfig): string {
  const body = addHeadingIds(renderMarkdown(markdown));
  const title = `${cfg.project.name} — Living Documentation`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(title)}</title>
<style>
:root{--ink:#101828;--muted:#667085;--line:#e4e7ec;--paper:#fff;--wash:#f8fafc;--accent:#175cd3;--soft:#eff4ff;--code:#101828;--max:1120px}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--wash);color:var(--ink);font:16px/1.68 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}main{max-width:var(--max);margin:28px auto;background:var(--paper);padding:clamp(28px,6vw,76px);box-shadow:0 18px 60px rgba(16,24,40,.07);border:1px solid var(--line);border-radius:20px}h1{font-size:clamp(2.2rem,6vw,4.5rem);line-height:1;letter-spacing:-.05em;margin:.1em 0 .55em;max-width:16ch}h2{font-size:clamp(1.55rem,3vw,2.25rem);line-height:1.15;letter-spacing:-.025em;margin:2.15em 0 .65em;padding-top:.5em;border-top:1px solid var(--line)}h3{font-size:1.2rem;margin:1.6em 0 .4em}p,li{max-width:86ch}a{color:var(--accent);text-underline-offset:.15em}blockquote{margin:1.3em 0;padding:1em 1.2em;border-left:4px solid var(--accent);background:var(--soft);border-radius:0 10px 10px 0;color:#344054}table{width:100%;border-collapse:collapse;margin:1.2em 0 1.8em;font-size:.94rem}th,td{padding:.72em .78em;border-bottom:1px solid var(--line);vertical-align:top;text-align:left}th{background:#f2f4f7}code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.9em;background:#f2f4f7;padding:.12em .32em;border-radius:5px}pre{overflow:auto;background:var(--code);color:#f9fafb;padding:1rem 1.05rem;border-radius:12px;white-space:pre-wrap}pre code{background:none;padding:0;color:inherit}ul,ol{padding-left:1.4em}strong{font-weight:720}@media(max-width:720px){body{background:#fff}main{margin:0;padding:22px 19px 54px;border:0;border-radius:0;box-shadow:none}table{display:block;overflow-x:auto}h2{margin-top:1.7em}}@media print{@page{size:Letter;margin:.65in}body{background:#fff;font-size:10.5pt;line-height:1.5}main{max-width:none;margin:0;padding:0;border:0;box-shadow:none}h1{font-size:30pt}h2{font-size:18pt;break-after:avoid}h3{break-after:avoid}table,blockquote,pre{break-inside:avoid}a{color:inherit;text-decoration:none}}
</style></head><body><main>${body}</main></body></html>`;
}
