/** Internal-link checking shared by the immune gate, the corrector and fitness. */

import type { LivingPressConfig } from "./config.ts";

const INTERNAL = /\]\((\/(?!\/)[^)\s#?]*)[^)]*\)/g;

export function normalizePath(p: string): string {
  const s = p.trim().replace(/\/+$/, "");
  return s.startsWith("/") ? s || "/" : `/${s}`;
}

/** Every internal path a post may link to: site pages, the blog index, and known posts. */
export function allowedPaths(cfg: LivingPressConfig, knownSlugs: string[]): Set<string> {
  const blog = normalizePath(cfg.site.blogPath);
  return new Set([...cfg.siteLinks.map((l) => normalizePath(l.path)), blog, ...knownSlugs.map((s) => `${blog === "/" ? "" : blog}/${s}`)]);
}

/** Internal markdown link targets in a body (protocol-relative `//host` links are external, not internal). */
export function internalLinks(body: string): string[] {
  return [...body.matchAll(INTERNAL)].map((m) => normalizePath(m[1]!));
}

export function deadLinks(body: string, cfg: LivingPressConfig, knownSlugs: string[]): string[] {
  const allowed = allowedPaths(cfg, knownSlugs);
  return [...new Set(internalLinks(body).filter((p) => !allowed.has(p)))];
}
