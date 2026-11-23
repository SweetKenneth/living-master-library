/**
 * GitHub evidence source: releases, successful production deployments, merged
 * pull requests and default-branch commits. No SDK; one token + fetch.
 */
import type { EvidenceInput, EvidenceSource } from "../engine/ports.ts";

type K = "releases" | "deployments" | "pull_requests" | "commits";
const trim = (s: unknown, n: number) => typeof s === "string" ? s.trim().slice(0, n) : "";

export function githubSource(opts: {
  owner: string; repo: string; token?: string; kinds?: K[]; apiBase?: string; id?: string; timeoutMs?: number;
  productionEnvironments?: string[]; maxPages?: number;
  /**
   * Commits are listed by commit date, which can be days older than the moment
   * they reach the default branch (a branch merged today keeps its old dates).
   * Re-read this many hours behind the cursor; duplicates are dropped by the database.
   */
  commitLookbackHours?: number;
}): EvidenceSource {
  const base = (opts.apiBase ?? "https://api.github.com").replace(/\/+$/, "");
  const repo = `${opts.owner}/${opts.repo}`;
  const kinds = new Set(opts.kinds ?? ["releases", "deployments", "pull_requests", "commits"]);
  const productionEnvironments = new Set((opts.productionEnvironments ?? ["production", "prod", "live"]).map((x) => x.toLowerCase().trim()));
  const headers: Record<string, string> = { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "livingchangelog" };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  const warnings: string[] = [];

  const get = async <T>(path: string): Promise<T> => {
    const res = await fetch(`${base}${path}`, { headers, signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000) });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 180);
      const limited = (res.status === 403 || res.status === 429) && (res.headers.get("x-ratelimit-remaining") === "0" || /rate limit/i.test(body));
      throw new Error(limited ? `GitHub rate limit reached${opts.token ? "" : " (unauthenticated calls get 60/hour; set a token)"}` : `GitHub ${res.status}: ${body}`);
    }
    return await res.json() as T;
  };
  const paged = async <T>(path: string, perPage: number, maxPages = opts.maxPages ?? 5): Promise<T[]> => {
    const out: T[] = [];
    for (let page = 1; page <= Math.max(1, maxPages); page += 1) {
      const join = path.includes("?") ? "&" : "?";
      const rows = await get<T[]>(`${path}${join}per_page=${perPage}&page=${page}`);
      out.push(...rows);
      if (rows.length < perPage) break;
    }
    return out;
  };

  return {
    id: opts.id ?? `github:${repo}`,
    warnings: () => [...warnings],
    async pull(sinceMs) {
      warnings.length = 0;
      const out: EvidenceInput[] = [];
      let defaultBranch = "main";
      try {
        const info = await get<{ default_branch?: string }>(`/repos/${opts.owner}/${opts.repo}`);
        defaultBranch = info.default_branch || defaultBranch;
      } catch (err) {
        warnings.push(`could not read repository metadata; assuming default branch main (${err instanceof Error ? err.message : String(err)})`);
      }

      if (kinds.has("releases")) {
        const rows = await paged<{ id: number; tag_name?: string; name?: string; body?: string; html_url?: string; author?: { login?: string }; published_at?: string; draft?: boolean; prerelease?: boolean; target_commitish?: string }>(`/repos/${opts.owner}/${opts.repo}/releases`, 50);
        for (const r of rows) {
          if (r.draft || !r.published_at || Date.parse(r.published_at) < sinceMs) continue;
          out.push({ source: `github:${repo}`, external_id: `release:${r.id}`, kind: "release", title: trim(r.name || r.tag_name || `Release ${r.id}`, 300), summary: trim(r.body, 8000), url: r.html_url ?? null, author: r.author?.login ?? null, labels: r.prerelease ? ["prerelease"] : ["release"], occurred_at: r.published_at, metadata: { tag: r.tag_name ?? null, target: r.target_commitish ?? null, prerelease: !!r.prerelease, shipped: !r.prerelease } });
        }
      }

      if (kinds.has("deployments")) {
        try {
          // Deployments often require a separate token scope. Missing access is
          // non-fatal: the source can still ingest releases/PRs/commits and health
          // receives a warning through source.warnings().
          const rows = await paged<{ id: number; ref?: string; sha?: string; task?: string; environment?: string; description?: string | null; created_at?: string; updated_at?: string; creator?: { login?: string }; transient_environment?: boolean; production_environment?: boolean }>(`/repos/${opts.owner}/${opts.repo}/deployments`, 30, Math.min(3, opts.maxPages ?? 3));
          for (const r of rows) {
            const at = r.updated_at ?? r.created_at;
            if (!at || Date.parse(at) < sinceMs) continue;
            let status: { id?: number; state?: string; description?: string | null; environment?: string; environment_url?: string | null; log_url?: string | null; created_at?: string; updated_at?: string } | null = null;
            try {
              const statuses = await get<Array<{ id?: number; state?: string; description?: string | null; environment?: string; environment_url?: string | null; log_url?: string | null; created_at?: string; updated_at?: string }>>(`/repos/${opts.owner}/${opts.repo}/deployments/${r.id}/statuses?per_page=1`);
              status = statuses[0] ?? null;
            } catch (err) {
              warnings.push(`could not read deployment ${r.id} status (${err instanceof Error ? err.message : String(err)})`);
            }
            if (status?.state !== "success") continue;
            const envName = trim(status.environment || r.environment || "", 120) || "unknown";
            const production = r.production_environment === true || productionEnvironments.has(envName.toLowerCase());
            const statusAt = status.updated_at ?? status.created_at ?? at;
            out.push({
              source: `github:${repo}`, external_id: `deployment:${r.id}:success:${status.id ?? statusAt}`, kind: "deployment",
              title: `Successful deployment to ${envName}`,
              summary: trim(status.description || r.description || `Deployment ${r.ref ?? r.sha ?? r.id} completed successfully.`, 8000),
              url: status.environment_url ?? status.log_url ?? null, author: r.creator?.login ?? null, labels: ["deployment", envName], occurred_at: statusAt,
              metadata: { deployment_id: r.id, deployment_status_id: status.id ?? null, state: "success", environment: envName, ref: r.ref ?? null, sha: r.sha ?? null, task: r.task ?? null, transient_environment: !!r.transient_environment, production_environment: r.production_environment === true, shipped: production },
            });
          }
        } catch (err) {
          warnings.push(`deployment API unavailable; use a deployment webhook if needed (${err instanceof Error ? err.message : String(err)})`);
        }
      }

      if (kinds.has("pull_requests")) {
        const rows = await paged<{ id: number; number: number; title?: string; body?: string; html_url?: string; user?: { login?: string }; merged_at?: string | null; base?: { ref?: string }; head?: { ref?: string; sha?: string }; merge_commit_sha?: string | null; labels?: { name?: string }[] }>(`/repos/${opts.owner}/${opts.repo}/pulls?state=closed&sort=updated&direction=desc`, 100);
        for (const r of rows) {
          if (!r.merged_at || Date.parse(r.merged_at) < sinceMs) continue;
          out.push({ source: `github:${repo}`, external_id: `pr:${r.number}`, kind: "pull_request", title: trim(r.title || `PR #${r.number}`, 300), summary: trim(r.body, 8000), url: r.html_url ?? null, author: r.user?.login ?? null, labels: (r.labels ?? []).map((x) => x.name ?? "").filter(Boolean), occurred_at: r.merged_at, metadata: { number: r.number, merged: true, base_branch: r.base?.ref ?? null, head_branch: r.head?.ref ?? null, head_sha: r.head?.sha ?? null, merge_sha: r.merge_commit_sha ?? null } });
        }
      }

      if (kinds.has("commits")) {
        const commitSince = Math.max(0, sinceMs - (opts.commitLookbackHours ?? 72) * 3600_000);
        const commitSinceIso = new Date(commitSince).toISOString();
        const rows = await paged<{ sha: string; html_url?: string; commit?: { message?: string; author?: { name?: string; date?: string | null }; committer?: { date?: string | null } }; author?: { login?: string } }>(`/repos/${opts.owner}/${opts.repo}/commits?sha=${encodeURIComponent(defaultBranch)}&since=${encodeURIComponent(commitSinceIso)}`, 100);
        for (const r of rows) {
          const at = r.commit?.committer?.date ?? r.commit?.author?.date;
          if (!at || Date.parse(at) < commitSince) continue;
          const message = trim(r.commit?.message, 9000); const [title, ...rest] = message.split("\n");
          out.push({ source: `github:${repo}`, external_id: `commit:${r.sha}`, kind: "commit", title: trim(title || r.sha.slice(0, 12), 300), summary: trim(rest.join("\n"), 8000), url: r.html_url ?? null, author: r.author?.login ?? r.commit?.author?.name ?? null, labels: [], occurred_at: at, metadata: { sha: r.sha, branch: defaultBranch } });
        }
      }

      return out.sort((a, b) => Date.parse(a.occurred_at ?? "") - Date.parse(b.occurred_at ?? ""));
    },
  };
}

export function staticSource(id: string, items: EvidenceInput[]): EvidenceSource {
  return { id, async pull(sinceMs) { return items.filter((x) => Date.parse(x.occurred_at ?? "") >= sinceMs); } };
}
