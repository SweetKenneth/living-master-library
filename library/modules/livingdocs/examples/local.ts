import { jsonStorage } from "../adapters/json.ts";
import { localProjectSource } from "../adapters/local.ts";
import { modelsFromEnv } from "../adapters/models.ts";
import { DEMO_CONFIG } from "../engine/config.ts";
import { runBuild } from "../engine/engine.ts";

declare const process: { env: Record<string, string | undefined> };
const cfg = structuredClone(DEMO_CONFIG);
cfg.project = { name: "Example Project", description: "A project used to demonstrate LivingDocs.", repository: "https://example.com/repo" };
const storage = await jsonStorage(".livingdocs/state.json");
const { models } = modelsFromEnv(process.env);
console.log(await runBuild({ storage, models, sources: [localProjectSource(".", cfg)], config: cfg }));
