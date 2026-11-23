import type { Priority, RoadmapStatus } from "./types.ts";
export type LivingRoadmapConfig = {
  project: { name: string; description: string; repository?: string };
  roadmap: { staleAfterDays: number; shipCandidateThreshold: number; implementationCandidateThreshold: number; duplicateThreshold: number; maxEvidencePerItem: number; maxUnplannedSignals: number };
  sourcePolicy: { maxFiles: number; maxFileBytes: number; maxExcerptChars: number; maxCommits: number; includeExtensions: string[]; excludeDirectories: string[]; excludeFiles: string[]; sensitiveNamePatterns: string[] };
  output: { markdownFile: string; htmlFile: string; auditFile: string; driftFile: string };
  seed: string;
};
export const STATUSES: RoadmapStatus[] = ["planned","active","blocked","shipped","abandoned","superseded","needs_confirmation"];
export const PRIORITIES: Priority[] = ["critical","high","medium","low"];
export const DEFAULT_CONFIG: LivingRoadmapConfig = {
  project: { name: "[ENTER PROJECT NAME HERE]", description: "[ENTER ONE-LINE PROJECT DESCRIPTION HERE]", repository: "" },
  roadmap: { staleAfterDays: 45, shipCandidateThreshold: 0.72, implementationCandidateThreshold: 0.58, duplicateThreshold: 0.82, maxEvidencePerItem: 8, maxUnplannedSignals: 40 },
  sourcePolicy: { maxFiles: 2500, maxFileBytes: 512000, maxExcerptChars: 24000, maxCommits: 200, includeExtensions: [".ts",".tsx",".js",".jsx",".mjs",".cjs",".py",".go",".rs",".java",".kt",".cs",".rb",".php",".sql",".md",".mdx",".txt",".json",".yaml",".yml",".toml",".ini",".html",".css",".scss",".sh",".ps1",".xml"], excludeDirectories: [".git","node_modules","dist","build","coverage",".next",".cache",".turbo",".venv","venv",".living",".livingroadmap"], excludeFiles: ["package-lock.json","pnpm-lock.yaml","yarn.lock"], sensitiveNamePatterns: ["^\\.env(?:\\..+)?$","\\.(?:pem|key|p12|pfx)$","(?:secret|credentials?|token)s?\\.(?:json|ya?ml|txt)$"] },
  output: { markdownFile: "ROADMAP.md", htmlFile: "roadmap.html", auditFile: "ROADMAP-AUDIT.md", driftFile: "ROADMAP-DRIFT.md" }, seed: "livingroadmap"
};
export function validateConfig(c: LivingRoadmapConfig): string[] { const p: string[]=[]; if (/\[ENTER/i.test(c.project.name)) p.push("project.name"); if (c.roadmap.staleAfterDays < 1) p.push("roadmap.staleAfterDays"); if (c.roadmap.shipCandidateThreshold < c.roadmap.implementationCandidateThreshold) p.push("roadmap.shipCandidateThreshold must be >= implementationCandidateThreshold"); return p; }
