#!/usr/bin/env node
import { createInterface } from "node:readline";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { stdin, stdout } from "node:process";
const rl = createInterface({ input: stdin, output: stdout });
const ask = (q, fallback = "") => new Promise((r) => rl.question(`${q}${fallback ? ` [${fallback}]` : ""}: `, (a) => r(a.trim() || fallback)));
const path = "livingguide.config.json";
if (!existsSync(path)) { console.error(`Missing ${path}. Copy it from the package or run livingguide init first.`); process.exit(1); }
const c = JSON.parse(readFileSync(path, "utf8"));
c.project.name = await ask("Project name", c.project.name.includes("[ENTER") ? "" : c.project.name);
c.project.description = await ask("One-line project description", c.project.description.includes("[ENTER") ? "" : c.project.description);
c.owner.name = await ask("Owner / creator name", c.owner.name.includes("[ENTER") ? "" : c.owner.name);
c.owner.role = await ask("Owner role", c.owner.role.includes("[ENTER") ? "Solo Founder / Architect" : c.owner.role);
c.owner.email = await ask("Owner email", c.owner.email.includes("[ENTER") ? "" : c.owner.email);
c.owner.website = await ask("Owner website", c.owner.website.includes("[ENTER") ? "" : c.owner.website);
c.owner.location = await ask("Owner location", c.owner.location.includes("[ENTER") ? "" : c.owner.location);
writeFileSync(path, `${JSON.stringify(c, null, 2)}\n`);
rl.close(); console.log(`\nUpdated ${path}. Run: livingguide scan`);
