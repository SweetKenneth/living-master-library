/** Fitness scoring for changelog entries. */

import type { LivingChangelogConfig } from "./config.ts";
import type { Antigen } from "./immune.ts";
import type { EntryRole } from "./ports.ts";

export type Gates = Record<string, boolean>;

export function fitness(input: {
  reader: number;
  skeptic: number;
  words: number;
  role: EntryRole;
  antigens: Antigen[];
  unsupported: string[];
  inflated: string[];
  shippingProven: boolean;
  cfg: LivingChangelogConfig;
}): { score: number; gates: Gates; passed: boolean } {
  const t = input.cfg.wordTargets[input.role];
  const gates: Gates = {
    reader: input.reader >= input.cfg.qualityFloor.reader,
    skeptic: input.skeptic >= input.cfg.qualityFloor.skeptic,
    immune: !input.antigens.some((a) => a.severity === "block"),
    clean: input.antigens.length === 0,
    grounded: input.unsupported.length === 0 && input.inflated.length === 0,
    shipping: input.shippingProven,
    length: input.words >= Math.max(20, t.min * 0.7) && input.words <= t.max * 1.25,
  };
  const mid = (t.min + t.max) / 2;
  const lengthFit = 1 - Math.min(1, Math.abs(input.words - mid) / Math.max(t.max, 1));
  const score = 0.34 * (input.reader / 100) + 0.46 * (input.skeptic / 100) + 0.1 * lengthFit + 0.1 * (input.antigens.length ? 0 : 1);
  const rounded = Math.round(score * 1000) / 1000;
  return { score: rounded, gates, passed: Object.values(gates).every(Boolean) && rounded >= input.cfg.qualityFloor.fitness };
}
