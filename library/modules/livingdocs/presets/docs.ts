/** LivingDocs documentation mission and section requirements. */
import type { SectionId } from "../engine/ports.ts";

export const DOCS_MISSION = `LivingDocs maintains documentation that stays aligned with the system it describes. It does not write plausible docs from vibes. It extracts implementation-backed claims, distinguishes implementation evidence from existing documentation, preserves uncertainty, and creates a durable documentation edition that can be regenerated when reality changes.`;

export const DOCS_TRUTH_RULES = `TRUTH RULES:
- Never invent an endpoint, flag, environment variable, default, data field, command, integration, deployment detail, limitation or compatibility promise.
- Existing docs prove what was documented, not necessarily what is still implemented.
- Code, schemas, configuration, tests and executable interfaces are stronger evidence for current behavior than prose documentation.
- "Confirmed" and "Observed" require exact evidence quotes supplied by the source inventory.
- If implementation and docs disagree, preserve the contradiction and favor neither silently.
- Planned/TODO behavior must never be presented as current behavior.
- If a command/example cannot be verified from evidence, label it unverified or omit it.
- Never include real credentials, tokens, private keys or secrets.
- Missing evidence becomes a visible documentation gap, not a license to improvise.`;

export const DOCS_AUDIT_MISSION = `Attack the documentation for drift. Look specifically for documented behavior with no implementation support, implementation behavior with no documentation coverage, stale defaults, renamed commands, stale API routes, broken examples, contradictory pages, secret leakage, unsupported compatibility promises, and prose that upgrades uncertainty into fact.`;

export const DOCS_PRESENTATION = `The output should feel like maintained first-party product documentation: navigable, concise, example-driven, mobile readable, print friendly, and technically authoritative without pretending to know what the evidence does not establish.`;

export const SECTION_REQUIREMENTS: Record<SectionId, string> = {
  "overview": "Explain what the project is, its purpose, major capabilities, supported surfaces, and current documentation confidence without marketing invention.",
  "getting-started": "Provide the shortest evidence-backed path from zero to a useful first result. Every command or step must be supported or explicitly marked unverified.",
  "installation": "Document runtime/tool requirements, package or repository installation, build prerequisites and setup constraints supported by source evidence.",
  "configuration": "Document configuration files, environment variables, defaults, required/optional values, precedence and validation behavior. Never print secret values.",
  "concepts": "Explain durable concepts, terminology, invariants and mental models required to use the project correctly.",
  "architecture": "Explain components, boundaries, data/control flow, adapters, dependencies and important implementation distinctions backed by code/schema evidence.",
  "api-reference": "Document externally callable APIs, routes, functions, payloads, response shapes and error behavior only where evidence exists.",
  "cli-reference": "Document commands, flags, arguments, exit behavior and examples only where source evidence exists.",
  "data-model": "Document persisted state, schemas, entities, storage locations and lifecycle semantics without exposing secrets.",
  "examples": "Provide minimal examples derived from verified interfaces. Prefer fewer correct examples over many speculative ones.",
  "operations": "Document build, deploy, background jobs, observability, recovery, backups and runtime procedures where evidence supports them.",
  "security": "Document trust boundaries, secret handling, authentication/authorization behavior and security-relevant defaults without exposing sensitive data.",
  "troubleshooting": "Document known failure modes and evidence-backed diagnosis/repair paths. Do not invent error messages or fixes.",
  "migration-upgrades": "Document version transitions, breaking changes, deprecations and migration steps supported by history/changelog/code evidence.",
  "limitations": "Preserve known limitations, unsupported scenarios, incomplete areas and claims that remain uncertain or require audit.",
  "reference-index": "Create a compact index of key commands, configuration names, important files/modules, routes/schemas and where each fact is evidenced.",
};
