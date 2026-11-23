-- LivingChangelog: autonomous changelog publisher — PostgreSQL schema.
-- Safe beside LivingPress: every table/function has its own namespace prefix.

create table if not exists public.livingchangelog_entries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  body text not null,
  role text not null check (role in ('update','release')),
  version text,
  categories text[] not null default '{}',
  evidence_ids uuid[] not null default '{}',
  evidence_urls text[] not null default '{}',
  audience text[] not null default '{}',
  caveats text[] not null default '{}',
  epistemic_status text not null default 'established',
  reader_score int not null default 0,
  skeptic_score int not null default 0,
  fitness numeric not null default 0,
  status text not null default 'published' check (status in ('published','unpublished')),
  published_at timestamptz not null default now(),
  last_audited_at timestamptz,
  corrections jsonb not null default '[]'::jsonb
);
create index if not exists livingchangelog_entries_published on public.livingchangelog_entries (status, published_at desc);

create table if not exists public.livingchangelog_evidence (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text not null,
  kind text not null check (kind in ('commit','pull_request','release','deployment','issue','manual')),
  title text not null,
  summary text not null default '',
  url text,
  author text,
  labels text[] not null default '{}',
  occurred_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','used','ignored')),
  attempts int not null default 0,
  ignore_reason text,
  metadata jsonb not null default '{}'::jsonb,
  unique (source, external_id)
);
create index if not exists livingchangelog_evidence_queue on public.livingchangelog_evidence (status, occurred_at asc);
create index if not exists livingchangelog_evidence_source on public.livingchangelog_evidence (source, occurred_at desc);

create table if not exists public.livingchangelog_runs (
  seq bigserial primary key,
  id uuid not null default gen_random_uuid(),
  at timestamptz not null,
  outcome text not null,
  reason text not null,
  entry_title text,
  entry_slug text,
  model text,
  reader_score int,
  skeptic_score int,
  fitness numeric,
  strategy text,
  receipt_hash text not null unique,
  prev_hash text not null,
  detail jsonb not null default '{}'::jsonb
);
create unique index if not exists livingchangelog_runs_one_child on public.livingchangelog_runs (prev_hash);

create table if not exists public.livingchangelog_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.livingchangelog_try_lease(p_name text, p_owner text, p_until_ms bigint, p_now_ms bigint)
returns boolean language plpgsql security definer set search_path = public as $$
declare got boolean;
begin
  insert into public.livingchangelog_state as s (key, value, updated_at)
  values ('lease.' || p_name, jsonb_build_object('owner', p_owner, 'until', p_until_ms), now())
  on conflict (key) do update set value = excluded.value, updated_at = now()
    where coalesce((s.value->>'until')::bigint, 0) <= p_now_ms or s.value->>'owner' = p_owner
  returning true into got;
  return coalesce(got, false);
end $$;

create or replace function public.livingchangelog_release_lease(p_name text, p_owner text)
returns void language sql security definer set search_path = public as $$
  update public.livingchangelog_state set value = jsonb_build_object('owner', '', 'until', 0), updated_at = now()
  where key = 'lease.' || p_name and value->>'owner' = p_owner;
$$;

create or replace function public.livingchangelog_rate_hit(p_surface text, p_signature text, p_minute bigint)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if p_surface not in ('public', 'admin') then raise exception 'invalid defense surface'; end if;
  if p_signature is null or length(p_signature) < 8 then raise exception 'invalid defense signature'; end if;
  insert into public.livingchangelog_state as s (key, value, updated_at)
  values ('defense.' || p_surface, jsonb_build_object('minute', p_minute, 'counts', jsonb_build_object(p_signature, 1)), now())
  on conflict (key) do update set
    value = case
      when coalesce((s.value->>'minute')::bigint, -1) = p_minute then
        jsonb_set(s.value, '{counts}', coalesce(s.value->'counts', '{}'::jsonb) || jsonb_build_object(p_signature, coalesce((s.value->'counts'->>p_signature)::integer, 0) + 1), true)
      else excluded.value
    end,
    updated_at = now()
  returning coalesce((value->'counts'->>p_signature)::integer, 0) into n;
  return n;
end $$;

revoke all on function public.livingchangelog_try_lease(text, text, bigint, bigint) from public, anon, authenticated;
revoke all on function public.livingchangelog_release_lease(text, text) from public, anon, authenticated;
revoke all on function public.livingchangelog_rate_hit(text, text, bigint) from public, anon, authenticated;
grant execute on function public.livingchangelog_try_lease(text, text, bigint, bigint) to service_role;
grant execute on function public.livingchangelog_release_lease(text, text) to service_role;
grant execute on function public.livingchangelog_rate_hit(text, text, bigint) to service_role;

create or replace function public.livingchangelog_runs_append_only() returns trigger language plpgsql as $$
begin raise exception 'livingchangelog_runs is append-only'; end $$;
drop trigger if exists livingchangelog_runs_no_mutation on public.livingchangelog_runs;
create trigger livingchangelog_runs_no_mutation before update or delete on public.livingchangelog_runs for each row execute function public.livingchangelog_runs_append_only();
drop trigger if exists livingchangelog_runs_no_truncate on public.livingchangelog_runs;
create trigger livingchangelog_runs_no_truncate before truncate on public.livingchangelog_runs for each statement execute function public.livingchangelog_runs_append_only();

revoke all on public.livingchangelog_evidence, public.livingchangelog_runs, public.livingchangelog_state from anon, authenticated;
revoke insert, update, delete, truncate on public.livingchangelog_entries from anon, authenticated;
grant select on public.livingchangelog_entries to anon, authenticated;
grant all on public.livingchangelog_entries, public.livingchangelog_evidence, public.livingchangelog_runs, public.livingchangelog_state to service_role;
grant usage, select on sequence public.livingchangelog_runs_seq_seq to service_role;

alter table public.livingchangelog_entries enable row level security;
alter table public.livingchangelog_evidence enable row level security;
alter table public.livingchangelog_runs enable row level security;
alter table public.livingchangelog_state enable row level security;

drop policy if exists "Published changelog entries are public" on public.livingchangelog_entries;
create policy "Published changelog entries are public" on public.livingchangelog_entries for select to anon, authenticated using (status = 'published');
