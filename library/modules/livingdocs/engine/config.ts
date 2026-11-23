/** LivingDocs configuration. */

import type { GuidePreset, SectionId, TruthStatus } from "./ports.ts";

export type LivingDocsConfig = {
  project: {
    name: string;
    description: string;
    repository?: string;
    docsBaseUrl?: string;
  };
  preset: GuidePreset;
  customSections?: SectionId[];
  voice: string;
  truthPolicy: {
    allowedStatuses: TruthStatus[];
    requireQuoteFor: TruthStatus[];
    verifiedMinConfidence: number;
    maxQuoteChars: number;
    staleAfterDays: number;
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
    includeVerificationReport: boolean;
  };
  qualityFloor: {
    truthfulness: number;
    coverage: number;
    verification: number;
  };
  breaker: { maxConsecutiveFailures: number; cooldownMinutes: number; heartbeatStaleHours: number };
  defense: { publicReadsPerMinute: number; adminCallsPerMinute: number };
  output: { markdownFile: string; htmlFile: string; auditFile: string; verificationFile: string };
  seed: string;
};

export const ALL_SECTIONS: SectionId[] = [
  "overview",
  "getting-started",
  "installation",
  "configuration",
  "concepts",
  "architecture",
  "api-reference",
  "cli-reference",
  "data-model",
  "examples",
  "operations",
  "security",
  "troubleshooting",
  "migration-upgrades",
  "limitations",
  "reference-index",
];

export const SECTION_TITLES: Record<SectionId, string> = {
  "overview": "Overview",
  "getting-started": "Getting Started",
  "installation": "Installation",
  "configuration": "Configuration",
  "concepts": "Core Concepts",
  "architecture": "Architecture",
  "api-reference": "API Reference",
  "cli-reference": "CLI Reference",
  "data-model": "Data Model & State",
  "examples": "Examples",
  "operations": "Operations",
  "security": "Security",
  "troubleshooting": "Troubleshooting",
  "migration-upgrades": "Migration & Upgrades",
  "limitations": "Known Limitations",
  "reference-index": "Reference Index",
};

export function sectionsForPreset(cfg: LivingDocsConfig): SectionId[] {
  if (cfg.preset === "custom") return cfg.customSections?.length ? [...new Set(cfg.customSections)] : ALL_SECTIONS;
  if (cfg.preset === "api") return ["overview", "getting-started", "installation", "configuration", "concepts", "api-reference", "data-model", "examples", "security", "limitations", "reference-index"];
  if (cfg.preset === "cli") return ["overview", "getting-started", "installation", "configuration", "cli-reference", "examples", "operations", "troubleshooting", "migration-upgrades", "limitations", "reference-index"];
  if (cfg.preset === "operator") return ["overview", "installation", "configuration", "architecture", "data-model", "operations", "security", "troubleshooting", "migration-upgrades", "limitations", "reference-index"];
  return ALL_SECTIONS;
}

export const DEMO_CONFIG: LivingDocsConfig = {
  project: {
    name: "[ENTER PROJECT NAME HERE]",
    description: "[ENTER ONE-LINE PROJECT DESCRIPTION HERE]",
    repository: "",
    docsBaseUrl: "",
  },
  preset: "developer",
  voice: "Precise, direct, example-driven, implementation-first. Preserve uncertainty and never document behavior that cannot be supported by evidence.",
  truthPolicy: {
    allowedStatuses: ["confirmed", "observed", "inferred", "planned", "speculative", "unknown", "needs_confirmation", "requires_audit"],
    requireQuoteFor: ["confirmed", "observed"],
    verifiedMinConfidence: 0.8,
    maxQuoteChars: 360,
    staleAfterDays: 60,
  },
  sourcePolicy: {
    maxFiles: 3000,
    maxFileBytes: 768000,
    maxExcerptChars: 32000,
    includeExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".go", ".rs", ".java", ".kt", ".cs", ".rb", ".php", ".sql", ".md", ".mdx", ".txt", ".json", ".yaml", ".yml", ".toml", ".ini", ".html", ".css", ".scss", ".sh", ".ps1", ".xml", ".graphql", ".proto"],
    excludeDirectories: [".git", "node_modules", "dist", "build", "coverage", ".next", ".cache", ".turbo", ".venv", "venv", ".livingdocs"],
    excludeFiles: ["package-lock.json", "pnpm-lock.yaml", "yarn.lock"],
    sensitiveNamePatterns: ["^\\.env(?:\\..+)?$", "\\.(?:pem|key|p12|pfx)$", "(?:secret|credentials?|token)s?\\.(?:json|ya?ml|txt)$"],
  },
  generation: {
    maxArtifactsPerExtractionBatch: 10,
    maxExtractionChars: 90000,
    maxClaimsPerBatch: 50,
    maxClaimsPerSection: 140,
    includeSourceInventory: true,
    includeUnknowns: true,
    includeVerificationReport: true,
  },
  qualityFloor: { truthfulness: 92, coverage: 70, verification: 75 },
  breaker: { maxConsecutiveFailures: 3, cooldownMinutes: 360, heartbeatStaleHours: 48 },
  defense: { publicReadsPerMinute: 120, adminCallsPerMinute: 20 },
  output: {
    markdownFile: "LIVING-DOCS.md",
    htmlFile: "living-docs.html",
    auditFile: "DOCS-AUDIT.md",
    verificationFile: "DOCS-VERIFICATION.md",
  },
  seed: "livingdocs",
};

export function validateConfig(c: LivingDocsConfig): string[] {
  const p: string[] = [];
  const walk = (v: unknown, path: string) => {
    if (typeof v === "string" && /\[ENTER[^\]]*\]/.test(v)) p.push(`${path} still has a placeholder`);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
  };
  walk(c.project, "project");
  const need = (ok: boolean, msg: string) => { if (!ok) p.push(msg); };
  need(!!c.project?.name?.trim(), "project.name is empty");
  need(["developer", "api", "cli", "operator", "custom"].includes(c.preset), "preset is invalid");
  need(c.truthPolicy.verifiedMinConfidence >= 0 && c.truthPolicy.verifiedMinConfidence <= 1, "truthPolicy.verifiedMinConfidence must be 0..1");
  need(c.truthPolicy.maxQuoteChars >= 40, "truthPolicy.maxQuoteChars must be >= 40");
  need(c.sourcePolicy.maxFiles >= 1, "sourcePolicy.maxFiles must be >= 1");
  need(c.sourcePolicy.maxFileBytes >= 1024, "sourcePolicy.maxFileBytes must be >= 1024");
  need(c.sourcePolicy.maxExcerptChars >= 1000, "sourcePolicy.maxExcerptChars must be >= 1000");
  need(c.generation.maxArtifactsPerExtractionBatch >= 1, "generation.maxArtifactsPerExtractionBatch must be >= 1");
  need(c.generation.maxClaimsPerBatch >= 1, "generation.maxClaimsPerBatch must be >= 1");
  c.sourcePolicy.sensitiveNamePatterns.forEach((x, i) => { try { new RegExp(x, "i"); } catch { p.push(`sourcePolicy.sensitiveNamePatterns[${i}] is invalid regex`); } });
  return p;
}
