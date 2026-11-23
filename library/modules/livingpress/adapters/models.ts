/**
 * Model providers. Shared implementation in core/models.ts (vendored livingcore).
 * Any OpenAI-compatible endpoint works: Lovable AI Gateway, OpenAI, OpenRouter,
 * Groq, Together, Mistral, a local Ollama/LM Studio. Plus Anthropic.
 */
import { modelsFromEnv as coreModelsFromEnv } from "../core/models.ts";
import type { ModelProvider } from "../core/types.ts";

export { openAICompatible, anthropic, lovableGateway } from "../core/models.ts";

/** LIVINGPRESS_AI_KEY (+ _URL/_MODEL), ANTHROPIC_API_KEY or OPENAI_API_KEY, plus an optional LIVINGPRESS_BACKUP_AI_KEY. */
export function modelsFromEnv(env: Record<string, string | undefined>, modelOverride?: string): { models: ModelProvider[]; label: string | null } {
  return coreModelsFromEnv(env, { prefix: "LIVINGPRESS" }, modelOverride);
}
