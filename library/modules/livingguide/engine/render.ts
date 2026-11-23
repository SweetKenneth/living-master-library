/** Canonical Markdown + premium PDF-ready HTML renderer. */

import { renderMarkdown } from "../core/markdown.ts";
import type { LivingGuideConfig } from "./config.ts";
import { SECTION_TITLES } from "./config.ts";
import type { AuditFinding, AuditSummary, GuideSection, ResurrectionCheck, SourceArtifact, TruthClaim } from "./ports.ts";
import { resurrectionMarkdown } from "./resurrection.ts";

export function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export function canonicalMarkdown(input: {
  cfg: LivingGuideConfig; sections: GuideSection[]; claims: TruthClaim[]; artifacts: SourceArtifact[];
  findings: AuditFinding[]; audit: AuditSummary; resurrection: ResurrectionCheck; generatedAt: string; version: number;
}): string {
  const { cfg, sections, claims, artifacts, findings, audit, resurrection, generatedAt, version } = input;
  const active = artifacts.filter((a) => a.status === "active");
  const unknowns = claims.filter((c) => c.status === "unknown" || c.status === "needs_confirmation" || c.status === "requires_audit" || c.stale);
  const toc = sections.map((s) => `- [${SECTION_TITLES[s.id]}](#${slugify(SECTION_TITLES[s.id])})`).join("\n");
  const statusCounts = claims.reduce<Record<string, number>>((m, c) => ((m[c.status] = (m[c.status] ?? 0) + 1), m), {});
  const sourceKinds = active.reduce<Record<string, number>>((m, a) => ((m[a.kind] = (m[a.kind] ?? 0) + 1), m), {});
  const open = findings.filter((f) => f.status === "open");
  const owner = `${cfg.owner.name} · ${cfg.owner.role}`;
  const scoreRows = Object.entries(audit).map(([k, v]) => `| ${k.replace(/_/g, " ")} | ${v}/100 |`).join("\n");
  const inventory = cfg.generation.includeSourceInventory ? `\n## Source Inventory\n\nThis edition was generated from **${active.length} active source artifacts** and **${claims.length} truth claims**. Source artifacts are evidence; the rendered prose is not itself evidence.\n\n| Source kind | Count |\n|---|---:|\n${Object.entries(sourceKinds).sort().map(([k, v]) => `| ${k} | ${v} |`).join("\n") || "| none | 0 |"}\n\n### Claim Status Ledger\n\n| Status | Count |\n|---|---:|\n${Object.entries(statusCounts).sort().map(([k, v]) => `| ${k.replace(/_/g, " ")} | ${v} |`).join("\n") || "| none | 0 |"}\n` : "";
  const gaps = cfg.generation.includeUnknowns ? `\n## Remaining Unknowns & Confirmation Queue\n\n${unknowns.length ? unknowns.slice(0, 100).map((c) => `- **${c.status.replace(/_/g, " ")}** — ${c.statement}`).join("\n") : "No unresolved claims are currently recorded. This does not prove the source set is complete."}\n` : "";
  const auditBlock = `\n## Canonical Audit Snapshot\n\n| Dimension | Score |\n|---|---:|\n${scoreRows}\n\nOpen findings: **${open.length}** (${open.filter((f) => f.severity === "critical").length} critical, ${open.filter((f) => f.severity === "warning").length} warning).\n`;
  return `# ${cfg.project.name} — Owner's Manual & Strategic Intelligence File\n\n**Canonical edition:** v${version}  \n**Generated:** ${generatedAt}  \n**Owner:** ${owner}  \n**Preset:** ${cfg.preset}  \n\n> This is a living canonical archive. Project claims are preserved with explicit epistemic status and source provenance. Unknowns are not silently filled. Secrets belong in external secure storage, never in this document.\n\n## Table of Contents\n\n${toc}\n${sections.map((s) => s.markdown.trim()).join("\n\n")}\n${inventory}${gaps}${auditBlock}${cfg.generation.includeResurrectionTest ? `\n${resurrectionMarkdown(resurrection).replace(/^# Resurrection Test/m, "## Resurrection Test")}` : ""}\n## Archive Attribution\n\n${cfg.owner.name}  \n${cfg.owner.role}  \n${cfg.owner.email}  \n${cfg.owner.website}  \n${cfg.owner.location}\n`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function addHeadingIds(html: string): string {
  return html.replace(/<h([2-6])>(.*?)<\/h\1>/g, (_m, n: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, ""); return `<h${n} id="${slugify(text)}">${inner}</h${n}>`;
  });
}

export function canonicalHtml(markdown: string, cfg: LivingGuideConfig): string {
  const body = addHeadingIds(renderMarkdown(markdown));
  const title = `${cfg.project.name} — Owner's Manual`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(title)}</title>
<style>
:root{--ink:#172033;--muted:#657089;--line:#dfe4ec;--paper:#fff;--wash:#f5f7fa;--accent:#243a73;--soft:#edf1f8;--max:1080px}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--wash);color:var(--ink);font:16px/1.68 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}main{max-width:var(--max);margin:32px auto;background:var(--paper);padding:clamp(28px,6vw,76px);box-shadow:0 18px 60px rgba(22,32,51,.08);border:1px solid var(--line);border-radius:18px}h1{font-size:clamp(2rem,6vw,4.2rem);line-height:1.02;letter-spacing:-.045em;margin:.1em 0 .6em;max-width:15ch}h2{font-size:clamp(1.55rem,3vw,2.3rem);line-height:1.15;letter-spacing:-.025em;margin:2.25em 0 .7em;padding-top:.45em;border-top:1px solid var(--line)}h3{font-size:1.22rem;margin:1.7em 0 .45em}h4{font-size:1.05rem}p,li{max-width:82ch}p{margin:.75em 0 1.05em}a{color:var(--accent);text-decoration-thickness:.08em;text-underline-offset:.15em}blockquote{margin:1.4em 0;padding:1em 1.2em;border-left:4px solid var(--accent);background:var(--soft);border-radius:0 10px 10px 0;color:#33415f}table{width:100%;border-collapse:collapse;margin:1.2em 0 1.8em;font-size:.94rem;display:table}th,td{padding:.7em .75em;border-bottom:1px solid var(--line);vertical-align:top;text-align:left}th{background:var(--soft);font-weight:700}code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.9em;background:var(--soft);padding:.12em .32em;border-radius:5px}pre{overflow:auto;background:#141b2b;color:#eef3ff;padding:1rem;border-radius:10px;white-space:pre-wrap}pre code{background:none;padding:0;color:inherit}hr{border:0;border-top:1px solid var(--line);margin:2em 0}img{max-width:100%;height:auto;border-radius:8px}ul,ol{padding-left:1.35em}strong{font-weight:720}
@media(max-width:720px){body{background:#fff}main{margin:0;padding:24px 20px 56px;border:0;border-radius:0;box-shadow:none}table{display:block;overflow-x:auto;white-space:normal}h2{margin-top:1.8em}}
@media print{@page{size:Letter;margin:.65in}body{background:#fff;font-size:10.5pt;line-height:1.5}main{max-width:none;margin:0;padding:0;border:0;box-shadow:none}h1{font-size:30pt}h2{font-size:18pt;break-after:avoid;page-break-after:avoid}h3{break-after:avoid}table,blockquote,pre{break-inside:avoid}a{color:inherit;text-decoration:none}a[href^="http"]:after{content:""}}
</style></head><body><main>${body}</main></body></html>`;
}
