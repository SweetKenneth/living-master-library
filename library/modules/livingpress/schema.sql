-- LivingPress: Autonomous Editorial Engine — database schema (PostgreSQL).
-- Works on Lovable Cloud / Supabase / any Postgres with PostgREST.
-- Public can READ published posts. Only the server (service role) writes.
-- Idempotent: re-running this file upgrades an existing 1.0.x install to 1.1.

create table if not exists public.livingpress_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  body text not null,
  role text not null check (role in ('pillar','support')),
  cluster text not null,
  pillar_slug text,
  image_url text not null,
  image_alt text not null default '',
  advocacy text not null default 'implicit' check (advocacy in ('implicit','explicit')),
  keywords text[] not null default '{}',
  caveats text[] not null default '{}',
  epistemic_status text not null default 'inference',
  reader_score int not null default 0,
  skeptic_score int not null default 0,
  fitness numeric not null default 0,
  status text not null default 'published' check (status in ('published','unpublished')),
  published_at timestamptz not null default now(),
  last_audited_at timestamptz,
  corrections jsonb not null default '[]'::jsonb
);
create index if not exists livingpress_posts_published on public.livingpress_posts (status, published_at desc);

create table if not exists public.livingpress_topics (
  id uuid primary key default gen_random_uuid(),
  cluster text not null,
  title text not null,
  angle text not null,
  role text not null check (role in ('pillar','support')),
  pain_point text not null default '',
  keywords text[] not null default '{}',
  gravity int not null default 50,
  status text not null default 'queued' check (status in ('queued','used','rejected')),
  attempts int not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists livingpress_topics_title on public.livingpress_topics (lower(title));
create index if not exists livingpress_topics_queue on public.livingpress_topics (status, gravity desc);

create table if not exists public.livingpress_runs (
  seq bigserial primary key,
  id uuid not null default gen_random_uuid(),
  at timestamptz not null,
  outcome text not null,
  reason text not null,
  topic_title text,
  post_slug text,
  model text,
  reader_score int,
  skeptic_score int,
  fitness numeric,
  strategy text,
  receipt_hash text not null unique,
  prev_hash text not null,
  detail jsonb not null default '{}'::jsonb
);

-- One child per parent: two ticks racing to seal against the same tip cannot fork the chain.
-- (If this fails on an old install, the chain already forked once; health will show where.)
create unique index if not exists livingpress_runs_one_child on public.livingpress_runs (prev_hash);

create table if not exists public.livingpress_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Tick lease: one tick at a time, atomically. The upsert only overwrites an expired lease
-- (or one this owner already holds); otherwise it returns no row and the caller backs off.
create or replace function public.livingpress_try_lease(p_name text, p_owner text, p_until_ms bigint, p_now_ms bigint)
returns boolean language plpgsql security definer set search_path = public as $$
declare got boolean;
begin
  insert into public.livingpress_state as s (key, value, updated_at)
  values ('lease.' || p_name, jsonb_build_object('owner', p_owner, 'until', p_until_ms), now())
  on conflict (key) do update set value = excluded.value, updated_at = now()
    where coalesce((s.value->>'until')::bigint, 0) <= p_now_ms or s.value->>'owner' = p_owner
  returning true into got;
  return coalesce(got, false);
end $$;

create or replace function public.livingpress_release_lease(p_name text, p_owner text)
returns void language sql security definer set search_path = public as $$
  update public.livingpress_state set value = jsonb_build_object('owner', '', 'until', 0), updated_at = now()
  where key = 'lease.' || p_name and value->>'owner' = p_owner;
$$;

revoke all on function public.livingpress_try_lease(text, text, bigint, bigint) from public, anon, authenticated;
revoke all on function public.livingpress_release_lease(text, text) from public, anon, authenticated;
grant execute on function public.livingpress_try_lease(text, text, bigint, bigint) to service_role;
grant execute on function public.livingpress_release_lease(text, text) to service_role;

-- Receipts are append-only: no updates, no deletes, even for the service role.
create or replace function public.livingpress_runs_append_only() returns trigger language plpgsql as $$
begin raise exception 'livingpress_runs is append-only'; end $$;
drop trigger if exists livingpress_runs_no_mutation on public.livingpress_runs;
create trigger livingpress_runs_no_mutation before update or delete on public.livingpress_runs
  for each row execute function public.livingpress_runs_append_only();
drop trigger if exists livingpress_runs_no_truncate on public.livingpress_runs;
create trigger livingpress_runs_no_truncate before truncate on public.livingpress_runs
  for each statement execute function public.livingpress_runs_append_only();

-- Supabase grants table privileges to anon/authenticated by default. RLS already blocks them;
-- revoking as well means a future policy mistake cannot expose engine internals.
revoke all on public.livingpress_topics, public.livingpress_runs, public.livingpress_state from anon, authenticated;
revoke insert, update, delete, truncate on public.livingpress_posts from anon, authenticated;
grant select on public.livingpress_posts to anon, authenticated;
grant all on public.livingpress_posts, public.livingpress_topics, public.livingpress_runs, public.livingpress_state to service_role;
grant usage, select on sequence public.livingpress_runs_seq_seq to service_role;

alter table public.livingpress_posts enable row level security;
alter table public.livingpress_topics enable row level security;
alter table public.livingpress_runs enable row level security;
alter table public.livingpress_state enable row level security;

drop policy if exists "Published posts are public" on public.livingpress_posts;
create policy "Published posts are public" on public.livingpress_posts for select to anon, authenticated using (status = 'published');
-- topics, runs, state: no policies => only the service role (server) can touch them.
