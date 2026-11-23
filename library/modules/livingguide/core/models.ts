/**
 * Model providers over plain fetch. Any OpenAI-compatible chat endpoint works:
 * Lovable AI Gateway, OpenAI, OpenRouter, Groq, Together, Mistral, a local
 * Ollama/LM Studio, etc. Build a NEXUS ladder by listing several, free first.
 */
import type { ChatMessage, ChatOptions, ModelProvider } from "./types.ts";

const trimSlash = (u: string) => u.replace(/\/+$/, "");

export function openAICompatible(opts: { id: string; baseUrl: string; apiKey: string; model: string; timeoutMs?: number; headers?: Record<string, string> }): ModelProvider {
  if (!opts.apiKey) throw new Error(`model "${opts.id}": missing API key`);
  // Some OpenAI-compatible hosts reject response_format. Learn that once and stop sending it.
  let jsonModeSupported = true;
  const send = (messages: ChatMessage[], o: ChatOptions, withJson: boolean) =>
    fetch(`${trimSlash(opts.baseUrl)}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${opts.apiKey}`, ...(opts.headers ?? {}) },
      body: JSON.stringify({
        model: opts.model, messages, max_tokens: o.maxTokens ?? 2000, temperature: o.temperature ?? 0.5,
        ...(withJson ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 90_000),
    });
  return {
    id: opts.id,
    async chat(messages: ChatMessage[], o: ChatOptions) {
      let res = await send(messages, o, !!o.json && jsonModeSupported);
      if (!res.ok && res.status === 400 && o.json && jsonModeSupported) {
        const text = await res.text();
        if (!/response_format|json_object|json mode/i.test(text)) throw new Error(`400 ${text.slice(0, 200)}`);
        jsonModeSupported = false;
        res = await send(messages, o, false);
      }
      if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as { choices?: { message?: { content?: string | { text?: string }[] } }[] };
      const content = data.choices?.[0]?.message?.content;
      return typeof content === "string" ? content : Array.isArray(content) ? content.map((c) => c?.text ?? "").join("") : "";
    },
  };
}

/** Anthropic Messages API. */
export function anthropic(opts: { id: string; apiKey: string; model: string; timeoutMs?: number; baseUrl?: string }): ModelProvider {
  if (!opts.apiKey) throw new Error(`model "${opts.id}": missing API key`);
  return {
    id: opts.id,
    async chat(messages, o) {
      const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
      const res = await fetch(`${trimSlash(opts.baseUrl ?? "https://api.anthropic.com")}/v1/messages`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": opts.apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: opts.model,
          ...(system ? { system } : {}),
          max_tokens: o.maxTokens ?? 2000,
          temperature: o.temperature ?? 0.5,
          messages: messages.filter((m) => m.role !== "system"),
        }),
        signal: AbortSignal.timeout(opts.timeoutMs ?? 90_000),
      });
      if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as { content?: { type?: string; text?: string }[] };
      return (data.content ?? []).filter((c) => !c.type || c.type === "text").map((c) => c.text ?? "").join("");
    },
  };
}

/** Lovable AI Gateway preset (OpenAI-compatible). */
export const lovableGateway = (apiKey: string, model = "google/gemini-2.5-flash") =>
  openAICompatible({ id: `lovable:${model}`, baseUrl: "https://ai.gateway.lovable.dev/v1", apiKey, model });

/**
 * Build the NEXUS ladder from environment variables. Every product uses the
 * same rules with its own prefix (LIVINGPRESS, LIVINGCHANGELOG, ...):
 *   {PREFIX}_AI_KEY (+ {PREFIX}_AI_URL, {PREFIX}_AI_MODEL)
 *     with a URL: any OpenAI-compatible endpoint; without one: the Lovable AI Gateway
 *   ANTHROPIC_API_KEY  (default model claude-haiku-4-5)
 *   OPENAI_API_KEY     (default model gpt-4o-mini)
 *   {PREFIX}_BACKUP_AI_KEY (+ _URL, _MODEL): optional second rung
 */
export function modelsFromEnv(env: Record<string, string | undefined>, opts: { prefix: string }, modelOverride?: string): { models: ModelProvider[]; label: string | null } {
  const P = opts.prefix.replace(/_+$/, "");
  const k = (name: string) => env[`${P}_${name}`];
  const models: ModelProvider[] = [];
  let label: string | null = null;
  const key = k("AI_KEY");
  if (key) {
    const model = modelOverride ?? k("AI_MODEL");
    const url = k("AI_URL");
    if (url) {
      if (!model) throw new Error(`${P}_AI_URL also needs ${P}_AI_MODEL`);
      models.push(openAICompatible({ id: `custom:${model}`, baseUrl: url, apiKey: key, model }));
      label = model;
    } else {
      const primary = model ?? "google/gemini-2.5-flash";
      models.push(lovableGateway(key, primary));
      if (!model) models.push(lovableGateway(key, "google/gemini-2.5-pro"));
      label = `${primary} via Lovable AI Gateway`;
    }
  } else if (env.ANTHROPIC_API_KEY) {
    const model = modelOverride ?? "claude-haiku-4-5";
    models.push(anthropic({ id: `anthropic:${model}`, apiKey: env.ANTHROPIC_API_KEY, model }));
    label = model;
  } else if (env.OPENAI_API_KEY) {
    const model = modelOverride ?? "gpt-4o-mini";
    models.push(openAICompatible({ id: `openai:${model}`, baseUrl: "https://api.openai.com/v1", apiKey: env.OPENAI_API_KEY, model }));
    label = model;
  }
  const backup = k("BACKUP_AI_KEY");
  if (backup) {
    models.push(openAICompatible({ id: "backup", baseUrl: k("BACKUP_AI_URL") ?? "https://openrouter.ai/api/v1", apiKey: backup, model: k("BACKUP_AI_MODEL") ?? "openai/gpt-4o-mini" }));
  }
  return { models, label };
}
