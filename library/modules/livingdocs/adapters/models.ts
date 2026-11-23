/** Model providers from vendored livingcore. */
import { modelsFromEnv as coreModelsFromEnv } from "../core/models.ts";
import type { ModelProvider } from "../core/types.ts";
export { openAICompatible, anthropic, lovableGateway } from "../core/models.ts";
export function modelsFromEnv(env: Record<string, string | undefined>, modelOverride?: string): { models: ModelProvider[]; label: string | null } {
  return coreModelsFromEnv(env, { prefix: "LIVINGDOCS" }, modelOverride);
}
