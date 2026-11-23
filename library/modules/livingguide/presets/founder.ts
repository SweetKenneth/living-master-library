/**
 * Founder Archive preset distilled from the original Founder's Guide generation
 * and enterprise audit prompts. This is a policy/specification, not source truth.
 */

import type { SectionId } from "../engine/ports.ts";

export const FOUNDER_ARCHIVE_MISSION = `Create the definitive canonical Owner's Manual and Strategic Intelligence File for the project. It is not a README. It must function as an owner's guide, architecture dossier, strategic asset profile, roadmap archive, ecosystem intelligence file, operational handbook, future-state planning document, monetization analysis, and continuity/inheritance layer. It should be useful to the creator years later, collaborators, operators, evaluators, buyers, licensees and inheritors.`;

export const FOUNDER_TRUTH_RULES = `Accuracy outranks persuasion. Never invent features, architecture, integrations, users, revenue, valuation proof, roadmap completion, implementation status, technical maturity, legal status, deployment status or market validation. Preserve uncertainty. Use explicit epistemic labels: Confirmed, Observed in code/docs, Inferred, Planned, Speculative, Unknown, Needs creator confirmation, Requires further audit. Every major claim must be traceable to source material or clearly identified as strategic inference.`;

export const FOUNDER_AUDIT_MISSION = `Perform a forensic truth, completeness, continuity, architecture, usability, presentation, preservation, strategic-consistency, future-operator and acquisition-readiness audit. Detect hallucinations, unsupported claims, omissions, contradictions, weak explanations, missing ecosystem relationships, poor prioritization, incomplete diagrams, formatting problems, technical inaccuracies, unrealistic valuation logic, hidden debt, continuity risks and knowledge gaps. Correct what can be corrected from evidence; downgrade uncertainty rather than manufacture certainty.`;

export const SECTION_REQUIREMENTS: Record<SectionId, string> = {
  "executive-summary": "What the project is, why it exists, problem solved, why it matters, maturity, strategic importance, ecosystem role, short-term opportunity and long-term vision.",
  "canonical-identity": "Official and alternate names, codenames, domains, branding, taglines, namespace relationships, creator attribution, creation timeline, important dates and version lineage.",
  "project-classification": "Classify relevant modes: infrastructure, product, platform, research, media, SaaS, governance, experimental, entertainment, asset, domain ecosystem, agent framework, cognitive system, and other evidenced classifications.",
  "core-concept": "Core idea, genuine innovation, differentiation, novelty, replication difficulty and technical/ecosystem moats. Avoid declaring a moat where only an aspiration exists.",
  "feature-inventory": "Every evidenced feature, subsystem, module, capability, workflow, automation, agent, route, integration, process, discovery, governance or architecture component; what it does, how, why, status, dependencies and expansion potential.",
  "architecture-analysis": "Infrastructure, backend/frontend, APIs, orchestration, routing, databases, storage, memory, deterministic and AI systems, governance, runtime, execution flow, scaling, fault tolerance, extensibility, strengths, weaknesses, debt, bottlenecks and scalability concerns.",
  "strategic-ecosystem-role": "Connections to other projects, domains, agents, infrastructure, namespaces, products, monetization systems and future ecosystem plans; dependencies, synergies, shared primitives, branding and infrastructure.",
  "development-history": "Origin, milestones, pivots, breakthroughs, failed approaches, discoveries, lessons, timeline evolution and documented reasons behind major decisions.",
  "current-state-assessment": "What works, what is incomplete, blockers, bugs, missing infrastructure, unfinished systems, deployment and operational readiness. Any maturity/stability/readiness score must be explicitly estimated and reasoned.",
  "monetization-analysis": "Business, licensing, SaaS, API, acquisition, enterprise, indie, subscription and marketplace possibilities. Separate current evidence-backed value from possible market value and speculative upside. Include fastest, highest-upside, lowest-effort and highest-leverage paths only when reasoned.",
  "competitive-positioning": "Competing systems or alternatives only when evidenced or researched; differentiation, defensibility, uniqueness and barriers. If research is absent, state that comparison is incomplete.",
  "future-vision": "Ultimate form, long-term roadmap, dream version, ideal architecture, integrations, planned advanced capabilities and clearly separated moonshots.",
  "priority-roadmap": "Immediate priorities, ROI tasks, quick wins, stabilization, monetization, R&D and infrastructure upgrades ordered by dependencies, leverage, creator energy and implementation difficulty.",
  "risk-analysis": "Technical, operational, financial, scaling, security, dependency, creator bottleneck, sustainability, market and documentation risks with evidence-aware severity.",
  "preservation-continuity": "Critical knowledge, operator guidance, irreplaceable insights, design philosophy, continuity requirements, inheritance considerations, recovery and resurrection guidance. Never print real secrets; use secure-reference placeholders.",
  "strategic-importance-ranking": "Ecosystem importance, monetization potential, uniqueness, defensibility, long-term importance, emotional importance and replacement difficulty. Labels/scores are estimates, not facts, and require reasoning.",
  "recommended-next-actions": "Immediate next steps, leverage improvements, monetization actions, documentation gaps, infrastructure priorities, packaging and branding recommendations grounded in the current state.",
  "canonical-summary": "What the project represents, why it matters, what it could become and why continued preservation/development may be justified, while preserving uncertainty.",
};

export const FOUNDER_PRESENTATION = `The final artifact should feel like a serious internal architecture dossier plus founder archive: deeply structured, modern, archival-grade, mobile readable, print friendly, with a linked table of contents, strong hierarchy, callouts, diagrams where they genuinely improve understanding, and project-matching branding. It must not feel generic or AI-generated.`;
