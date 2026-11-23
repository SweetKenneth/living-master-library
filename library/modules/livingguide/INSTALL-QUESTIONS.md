# LivingGuide Installation Questions

Before the first canonical build, answer these in `livingguide.config.json`:

1. What is the project's canonical name and one-line description?
2. Which alternate names/domains/repository identify it?
3. Who owns the archive and what attribution should appear in exported manuals?
4. Which preset should be canonical: Founder, Engineering, Operator, Acquisition or Custom?
5. Which directories/files should never be scanned?
6. Are there additional filename patterns that may contain credentials?
7. How large may an individual source file be before it is skipped?
8. Which AI provider should NEXUS use?
9. Should local JSON state be sufficient, or should private PostgreSQL/PostgREST storage be used?
10. Where will `.livingguide/` be backed up? It contains the continuity state and historical guide editions.
11. Which creator notes/chats/decisions need to be supplied through a manual source so that source code is not mistaken for the whole project history?

Never put actual secrets into the answers. Document only vault/access procedures.
