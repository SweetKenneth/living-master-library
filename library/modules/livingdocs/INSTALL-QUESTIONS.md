# LivingDocs — Install Questions

Before the first canonical build, decide:

1. What is the project's canonical name and one-line description?
2. What repository should the docs point to?
3. Is there a published docs base URL?
4. Which documentation lens should be canonical: Developer, API, CLI, Operator or Custom?
5. Which source directories should be excluded beyond the defaults?
6. Are there generated files that should not count as implementation evidence?
7. Which additional secret/credential filename patterns should be skipped?
8. Which model provider will be used for extraction/curation?
9. Where should `.livingdocs/state.json` be backed up if historical claim/evidence state matters?
10. Which output files should be published versus kept private?

Do not place credentials into the answers or the docs configuration. Configure provider keys through the environment or your secret manager.
