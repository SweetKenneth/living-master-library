# Living Master Library — Install Questions

The umbrella can be installed before any provider or database is chosen. Do not invent answers.

1. Which modules should this project enable? Default: all.
2. Which AI provider should the Living modules use? You may use module-specific keys or the shared `LIVING_AI_*` aliases.
3. Does this project require database-backed LivingPress/LivingChangelog operation, or only local Guide/Docs state and Changelog preview?
4. Where should server-only secrets be stored? Never place them in `.living/library.json`.
5. For LivingPress: what site, audience, house facts, forbidden claims, content topics, and cadence are correct today? Run `living press setup`.
6. For LivingGuide: fill all remaining owner/project placeholders in `.living/config/livingguide.config.json`.
7. For LivingDocs: fill all remaining project placeholders in `.living/config/livingdocs.config.json`.
8. For LivingChangelog deployment: fill `.living/config/livingchangelog.config.json`; public `preview` can run without it.
9. Run `living doctor` and resolve missing/invalid configs. Placeholder warnings are allowed during setup but should not be mistaken for a complete configuration.
10. Run `living audit` before treating a packaged installation as healthy.
