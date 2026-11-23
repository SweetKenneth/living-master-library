const PREFIX = { press: 'LIVINGPRESS', changelog: 'LIVINGCHANGELOG', guide: 'LIVINGGUIDE', docs: 'LIVINGDOCS', roadmap: 'LIVINGROADMAP' };

export function moduleEnv(id, source = process.env) {
  const env = { ...source };
  const prefix = PREFIX[id];
  if (!prefix) return env;
  const aliases = [
    ['AI_KEY', 'LIVING_AI_KEY'],
    ['AI_URL', 'LIVING_AI_URL'],
    ['AI_MODEL', 'LIVING_AI_MODEL'],
    ['DB_URL', 'LIVING_DB_URL'],
    ['DB_SERVICE_KEY', 'LIVING_DB_SERVICE_KEY'],
    ['OWNER_SECRET', 'LIVING_OWNER_SECRET'],
    ['CRON_SECRET', 'LIVING_CRON_SECRET']
  ];
  for (const [suffix, shared] of aliases) {
    const target = `${prefix}_${suffix}`;
    if (!env[target] && env[shared]) env[target] = env[shared];
  }
  return env;
}

export function environmentPresence(source = process.env) {
  const keys = ['LIVING_AI_KEY','LIVING_AI_URL','LIVING_AI_MODEL','LIVING_DB_URL','LIVING_DB_SERVICE_KEY','LIVING_OWNER_SECRET','LIVING_CRON_SECRET','ANTHROPIC_API_KEY','OPENAI_API_KEY','GITHUB_TOKEN'];
  return Object.fromEntries(keys.map((k) => [k, Boolean(source[k])]));
}
