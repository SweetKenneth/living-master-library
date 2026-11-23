/** LivingGuide configuration. */

import type { GuidePreset, SectionId, TruthStatus } from "./ports.ts";

export type LivingGuideConfig = {
  project: {
    name: string;
    alternateNames: string[];
    description: string;
    domains: string[];
    repository?: string;
  };
  owner: {
    name: string;
    role: string;
    email: string;
    website: string;
    location: string;
  };
  preset: GuidePreset;
  customSections?: SectionId[];
  voice: string;
  truthPolicy: {
    allowedStatuses: TruthStatus[];
    requireQuoteFor: TruthStatus[];
    confirmedMinConfidence: number;
    maxQuoteChars: number;
    staleAfterDays: number;
    forbidUnsupportedScores: boolean;
  };
  sourcePolicy: {
    maxFiles: number;
    maxFileBytes: number;
    maxExcerptChars: number;
    includeExtensions: string[];
    excludeDirectories: string[];
    excludeFiles: string[];
    sensitiveNamePatterns: string[];
  };
  generation: {
    maxArtifactsPerExtractionBatch: number;
    maxExtractionChars: number;
    maxClaimsPerBatch: number;
    maxClaimsPerSection: number;
    includeSourceInventory: boolean;
    includeUnknowns: boolean;
    includeResurrectionTest: boolean;
  };
  qualityFloor: {
    truthfulness: number;
    completeness: number;
    continuity: number;
  };
  cadence: {
    auditEveryBuilds: number;
    staleAuditHours: number;
  };
  breaker: { maxConsecutiveFailures: number; cooldownMinutes: number; heartbeatStaleHours: number };
  defense: { publicReadsPerMinute: number; adminCallsPerMinute: number };
  output: { markdownFile: string; htmlFile: string; auditFile: string; resurrectionFile: string };
  seed: string;
};

export const ALL_SECTIONS: SectionId[] = [
  "executive-summary", "canonical-identity", "project-classification", "core-concept", "feature-inventory", "architecture-analysis",
  "strategic-ecosystem-role", "development-history", "current-state-assessment", "monetization-analysis", "competitive-positioning",
  "future-vision", "priority-roadmap", "risk-analysis", "preservation-continuity", "strategic-importance-ranking",
  "recommended-next-actions", "canonical-summary",
];

export const SECTION_TITLES: Record<SectionId, string> = {
  "executive-summary": "Executive Summary",
  "canonical-identity": "Canonical Identity",
  "project-classification": "Project Classification",
  "core-concept": "Core Concept",
  "feature-inventory": "Full Feature Inventory",
  "architecture-analysis": "Architecture Analysis",
  "strategic-ecosystem-role": "Strategic Ecosystem Role",
  "development-history": "Development History",
  "current-state-assessment": "Current State Assessment",
  "monetization-analysis": "Monetization Analysis",
  "competitive-positioning": "Competitive Positioning",
  "future-vision": "Future Vision",
  "priority-roadmap": "Priority Roadmap",
  "risk-analysis": "Risk Analysis",
  "preservation-continuity": "Preservation & Continuity",
  "strategic-importance-ranking": "Strategic Importance Ranking",
  "recommended-next-actions": "Recommended Next Actions",
  "canonical-summary": "Canonical Summary",
};

export function sectionsForPreset(cfg: LivingGuideConfig): SectionId[] {
  if (cfg.preset === "custom") return cfg.customSections?.length ? [...new Set(cfg.customSections)] : ALL_SECTIONS;
  if (cfg.preset === "engineering") return [
    "executive-summary", "canonical-identity", "core-concept", "feature-inventory", "architecture-analysis", "strategic-ecosystem-role",
    "development-history", "current-state-assessment", "future-vision", "priority-roadmap", "risk-analysis", "preservation-continuity",
    "recommended-next-actions", "canonical-summary",
  ];
  if (cfg.preset === "operator") return [
    "executive-summary", "canonical-identity", "feature-inventory", "architecture-analysis", "strategic-ecosystem-role", "current-state-assessment",
    "priority-roadmap", "risk-analysis", "preservation-continuity", "recommended-next-actions", "canonical-summary",
  ];
  if (cfg.preset === "acquisition") return [
    "executive-summary", "canonical-identity", "project-classification", "core-concept", "feature-inventory", "architecture-analysis",
    "strategic-ecosystem-role", "development-history", "current-state-assessment", "monetization-analysis", "competitive-positioning",
    "future-vision", "risk-analysis", "preservation-continuity", "strategic-importance-ranking", "recommended-next-actions", "canonical-summary",
  ];
  return ALL_SECTIONS;
}

export const DEMO_CONFIG: LivingGuideConfig = {
  project: {
    name: "[ENTER PROJECT NAME HERE]",
    alternateNames: [],
    description: "[ENTER ONE-LINE PROJECT DESCRIPTION HERE]",
    domains: [],
    repository: "",
  },
  owner: {
    name: "[ENTER OWNER NAME HERE]",
    role: "[ENTER OWNER ROLE HERE]",
    email: "[ENTER OWNER EMAIL HERE]",
    website: "[ENTER OWNER WEBSITE HERE]",
    location: "[ENTER OWNER LOCATION HERE]",
  },
  preset: "founder",
  voice: "Precise, architectural, plainspoken, evidence-first. Preserve uncertainty. Avoid hype and generic AI phrasing.",
  truthPolicy: {
    allowedStatuses: ["confirmed", "observed", "inferred", "planned", "speculative", "unknown", "needs_confirmation", "requires_audit"],
    requireQuoteFor: ["confirmed", "observed"],
    confirmedMinConfidence: 0.8,
    maxQuoteChars: 320,
    staleAfterDays: 90,
    forbidUnsupportedScores: true,
  },
  sourcePolicy: {
    maxFiles: 2500,
    maxFileBytes: 512000,
    maxExcerptChars: 24000,
    includeExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".go", ".rs", ".java", ".kt", ".cs", ".rb", ".php", ".sql", ".md", ".mdx", ".txt", ".json", ".yaml", ".yml", ".toml", ".ini", ".html", ".css", ".scss", ".sh", ".ps1", ".xml"],
    excludeDirectories: [".git", "node_modules", "dist", "build", "coverage", ".next", ".cache", ".turbo", ".venv", "venv"],
    excludeFiles: ["package-lock.json", "pnpm-lock.yaml", "yarn.lock"],
    sensitiveNamePatterns: ["^\\.env(?:\\..+)?$", "\\.(?:pem|key|p12|pfx)$", "(?:secret|credentials?|token)s?\\.(?:json|ya?ml|txt)$"],
  },
  generation: {
    maxArtifactsPerExtractionBatch: 10,
    maxExtractionChars: 80000,
    maxClaimsPerBatch: 40,
    maxClaimsPerSection: 120,
    includeSourceInventory: true,
    includeUnknowns: true,
    includeResurrectionTest: true,
  },
  qualityFloor: { truthfulness: 90, completeness: 75, continuity: 75 },
  cadence: { auditEveryBuilds: 1, staleAuditHours: 72 },
  breaker: { maxConsecutiveFailures: 3, cooldownMinutes: 360, heartbeatStaleHours: 48 },
  defense: { publicReadsPerMinute: 120, adminCallsPerMinute: 20 },
  output: {
    markdownFile: "OWNER-MANUAL.md",
    htmlFile: "owner-manual.html",
    auditFile: "GUIDE-AUDIT.md",
    resurrectionFile: "RESURRECTION-TEST.md",
  },
  seed: "livingguide",
};

export function validateConfig(c: LivingGuideConfig): string[] {
  const p: string[] = [];
  const walk = (v: unknown, path: string) => {
    if (typeof v === "string" && /\[ENTER[^\]]*\]/.test(v)) p.push(`${path} still has a placeholder`);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
  };
  walk(c.project, "project"); walk(c.owner, "owner");
  const need = (ok: boolean, msg: string) => { if (!ok) p.push(msg); };
  need(!!c.project?.name?.trim(), "project.name is empty");
  need(!!c.owner?.name?.trim(), "owner.name is empty");
  need(["founder", "engineering", "operator", "acquisition", "custom"].includes(c.preset), "preset is invalid");
  need(c.truthPolicy.confirmedMinConfidence >= 0 && c.truthPolicy.confirmedMinConfidence <= 1, "truthPolicy.confirmedMinConfidence must be 0..1");
  need(c.truthPolicy.maxQuoteChars >= 40, "truthPolicy.maxQuoteChars must be >= 40");
  need(c.sourcePolicy.maxFiles >= 1, "sourcePolicy.maxFiles must be >= 1");
  need(c.sourcePolicy.maxFileBytes >= 1024, "sourcePolicy.maxFileBytes must be >= 1024");
  need(c.sourcePolicy.maxExcerptChars >= 1000, "sourcePolicy.maxExcerptChars must be >= 1000");
  need(c.generation.maxArtifactsPerExtractionBatch >= 1, "generation.maxArtifactsPerExtractionBatch must be >= 1");
  need(c.generation.maxClaimsPerBatch >= 1, "generation.maxClaimsPerBatch must be >= 1");
  need(c.qualityFloor.truthfulness >= 0 && c.qualityFloor.truthfulness <= 100, "qualityFloor.truthfulness must be 0..100");
  need(c.qualityFloor.completeness >= 0 && c.qualityFloor.completeness <= 100, "qualityFloor.completeness must be 0..100");
  need(c.qualityFloor.continuity >= 0 && c.qualityFloor.continuity <= 100, "qualityFloor.continuity must be 0..100");
  c.sourcePolicy.sensitiveNamePatterns.forEach((x, i) => { try { new RegExp(x, "i"); } catch { p.push(`sourcePolicy.sensitiveNamePatterns[${i}] is invalid regex`); } });
  return p;
}
