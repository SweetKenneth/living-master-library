/**
 * Voices. A voice changes how LivingChangelog sounds, never what it is allowed
 * to claim: every preset still runs through the same immune gate, the same
 * Skeptic and the same shipping proof. `writing` goes into config.voice;
 * `narrate` is how the CLI talks about what it published and what it skipped.
 */

export type VoiceName = "plain" | "friendly" | "dry" | "technical";

export type Narration = {
  intro: (repo: string, days: number) => string;
  published: (n: number) => string;
  nothing: string;
  skippedDeps: (n: number) => string;
  skippedChores: (n: number) => string;
  skippedJudged: (n: number) => string;
  heldUnproven: (n: number) => string;
  heldOther: (n: number) => string;
  noKey: string;
  outro: string;
};

export type Voice = { name: VoiceName; label: string; description: string; writing: string; narrate: Narration };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const VOICES: Record<VoiceName, Voice> = {
  plain: {
    name: "plain",
    label: "Plain",
    description: "Factual and compact. The safe default.",
    writing: "Plain, factual, compact. Lead with user impact. No hype, no emoji, no marketing adjectives. Never turn an internal implementation detail into a customer benefit unless the evidence proves that benefit.",
    narrate: {
      intro: (repo, days) => `Reading the last ${days} days of ${repo}.`,
      published: (n) => `${plural(n, "entry", "entries")} would be published.`,
      nothing: "Nothing in this window clears the bar for a public entry.",
      skippedDeps: (n) => `Skipped ${plural(n, "dependency update")}.`,
      skippedChores: (n) => n === 1 ? "Skipped 1 chore or internal change." : `Skipped ${n} chores and internal changes.`,
      skippedJudged: (n) => `Left out ${plural(n, "change")} judged not worth announcing.`,
      heldUnproven: (n) => `Holding ${plural(n, "change")} with no proof ${n === 1 ? "it" : "they"} reached production.`,
      heldOther: (n) => `Holding ${plural(n, "change")} to bundle with related work later.`,
      noKey: "No AI key found, so this is the evidence-only view: what was found, what would be skipped, and what can be proven shipped. Set an AI key to see the drafted entries.",
      outro: "Every skip above is recorded with a reason. Nothing here was published anywhere.",
    },
  },
  friendly: {
    name: "friendly",
    label: "Friendly",
    description: "Warm and direct, written to the reader. Good for consumer products.",
    writing: "Warm and direct. Talk to the reader as \"you\". Short sentences, everyday words. Light, never cutesy. At most one exclamation mark per entry. No hype, no emoji, no marketing adjectives. Never promise more than the evidence shows.",
    narrate: {
      intro: (repo, days) => `Let's see what actually changed in ${repo} over the last ${days} days.`,
      published: (n) => n === 1 ? "Here's the one entry your readers would get." : `Here are the ${n} entries your readers would get.`,
      nothing: "Quiet stretch. Nothing here is worth interrupting your readers for, and that's fine.",
      skippedDeps: (n) => `Skipped ${plural(n, "dependency update")}. Important, just not for your readers.`,
      skippedChores: (n) => `Skipped ${plural(n, "behind-the-scenes change")}.`,
      skippedJudged: (n) => `Left out ${plural(n, "change")} that wouldn't mean much to anyone outside the team.`,
      heldUnproven: (n) => `Waiting on ${plural(n, "change")} until there's proof ${n === 1 ? "it's" : "they're"} live.`,
      heldOther: (n) => `Saving ${plural(n, "small change")} to bundle with something bigger.`,
      noKey: "No AI key yet, so you're seeing the groundwork: what was found, what gets skipped, and what's provably live. Add a key to see the actual entries.",
      outro: "Nothing was published. This was just a look.",
    },
  },
  dry: {
    name: "dry",
    label: "Dry",
    description: "Understated and precise, with the occasional wry aside. Developers tend to like it.",
    writing: "Understated and precise. Short declarative sentences. An occasional wry aside about the change itself is allowed, never about users and never in security notes or fixes for problems that hurt people. No hype, no emoji, no exclamation marks.",
    narrate: {
      intro: (repo, days) => `${repo}, last ${days} days. Let's see what actually shipped.`,
      published: (n) => n === 1 ? "One entry survived." : `${n} entries survived.`,
      nothing: "Lots of activity. Nothing worth announcing. This happens more than people admit.",
      skippedDeps: (n) => `Skipped ${plural(n, "dependency bump")}. They know what they did.`,
      skippedChores: (n) => `Skipped ${plural(n, "chore")}. Necessary, not news.`,
      skippedJudged: (n) => `Left out ${plural(n, "change")} that only ${n === 1 ? "matters" : "matter"} to the people who wrote ${n === 1 ? "it" : "them"}.`,
      heldUnproven: (n) => `Holding ${plural(n, "change")}. Merged is not shipped.`,
      heldOther: (n) => `Holding ${plural(n, "change")} until there's enough to say.`,
      noKey: "No AI key, so no prose. You still get the useful part: what was found, what gets skipped, and what can be proven live.",
      outro: "Nothing was published. Nobody was harmed.",
    },
  },
  technical: {
    name: "technical",
    label: "Technical",
    description: "Precise and terse, for developer tools, APIs and SDKs.",
    writing: "For developers. Precise and terse. Name APIs, flags, config keys and endpoints exactly as they appear in the evidence and format them as code. State breaking changes and required actions first. No marketing language, no emoji.",
    narrate: {
      intro: (repo, days) => `source=${repo} window=${days}d`,
      published: (n) => `entries: ${n}`,
      nothing: "entries: 0 (no evidence met the publication threshold)",
      skippedDeps: (n) => `skipped.dependencies: ${n}`,
      skippedChores: (n) => `skipped.chores: ${n}`,
      skippedJudged: (n) => `skipped.not_user_facing: ${n}`,
      heldUnproven: (n) => `held.no_shipping_proof: ${n}`,
      heldOther: (n) => `held.bundling: ${n}`,
      noKey: "mode: evidence-only (no AI key). Set ANTHROPIC_API_KEY, OPENAI_API_KEY or LIVINGCHANGELOG_AI_KEY to draft entries.",
      outro: "published: none (preview, in-memory storage)",
    },
  },
};

export const VOICE_NAMES = Object.keys(VOICES) as VoiceName[];
export const isVoiceName = (v: unknown): v is VoiceName => typeof v === "string" && v in VOICES;
