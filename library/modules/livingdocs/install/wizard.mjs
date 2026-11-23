#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const file = new URL("../livingdocs.config.json", import.meta.url);
const c = JSON.parse(await readFile(file, "utf8"));
const rl = createInterface({ input, output });
const ask = async (label, fallback = "") => (await rl.question(`${label}${fallback ? ` [${fallback}]` : ""}: `)).trim() || fallback;

c.project.name = await ask("Project name", String(c.project.name).includes("[ENTER") ? "My Project" : c.project.name);
c.project.description = await ask("One-line project description", String(c.project.description).includes("[ENTER") ? "" : c.project.description);
c.project.repository = await ask("Repository URL (optional)", c.project.repository || "");
c.project.docsBaseUrl = await ask("Published docs URL (optional)", c.project.docsBaseUrl || "");
c.preset = await ask("Preset: developer / api / cli / operator / custom", c.preset || "developer");
rl.close();
await writeFile(file, `${JSON.stringify(c, null, 2)}\n`, "utf8");
console.log(`\nUpdated ${file.pathname}\nNext: copy livingdocs.config.json to your project root, then run livingdocs scan.`);
