-- LivingDocs durable truth store for PostgreSQL/Supabase/PostgREST.
create extension if not exists pgcrypto;

create table if not exists public.livingdocs_artifacts (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text not null,
  kind text not null,
  path text not null,
  title text not null,
  content_excerpt text not null default '',
  content_hash text not null,
  bytes bigint not null default 0,
  language text,
  observed_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active','deleted')),
  metadata jsonb not null default '{}'::jsonb,
  unique(source, external_id)
);
create index if not exists livingdocs_artifacts_status_idx on public.livingdocs_artifacts(status, path);

create table if not exists public.livingdocs_claims (
  id uuid primary key default gen_random_uuid(),
  claim_key text not null unique,
  section text not null,
  statement text not null,
  status text not null,
  confidence numeric not null default 0.5,
  sources jsonb not null default '[]'::jsonb,
  basis text not null default 'unknown',
  tags jsonb not null default '[]'::jsonb,
  first_seen_at timestamptz not null,
  last_verified_at timestamptz not null,
  stale boolean not null default false,
  requires_confirmation boolean not null default false,
  contradictions jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists livingdocs_claims_section_idx on public.livingdocs_claims(section, status);

create table if not exists public.livingdocs_guides (
  id uuid primary key default gen_random_uuid(),
  version integer not null,
  preset text not null,
  title text not null,
  markdown text not null,
  html text not null,
  generated_at timestamptz not null,
  source_ids jsonb not null default '[]'::jsonb,
  claim_ids jsonb not null default '[]'::jsonb,
  sections jsonb not null default '[]'::jsonb,
  audit_summary jsonb not null default '{}'::jsonb,
  verification jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  unique(preset, version)
);
create index if not exists livingdocs_guides_latest_idx on public.livingdocs_guides(preset, generated_at desc);

create table if not exists public.livingdocs_findings (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null,
  severity text not null check (severity in ('info','warning','critical')),
  kind text not null,
  message text not null,
  recommendation text not null,
  claim_ids jsonb not null default '[]'::jsonb,
  source_ids jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open','resolved')),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists livingdocs_findings_open_idx on public.livingdocs_findings(status, severity, at desc);

create table if not exists public.livingdocs_runs (
  seq bigserial primary key,
  id uuid not null default gen_random_uuid() unique,
  at timestamptz not null,
  outcome text not null,
  reason text not null,
  model text,
  source_count integer,
  claim_count integer,
  finding_count integer,
  guide_version integer,
  score numeric,
  strategy text,
  receipt_hash text not null unique,
  prev_hash text not null unique,
  detail jsonb not null default '{}'::jsonb
);

create table if not exists public.livingdocs_state (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.livingdocs_artifacts enable row level security;
alter table public.livingdocs_claims enable row level security;
alter table public.livingdocs_guides enable row level security;
alter table public.livingdocs_findings enable row level security;
alter table public.livingdocs_runs enable row level security;
alter table public.livingdocs_state enable row level security;

-- LivingDocs contains owner/infrastructure intelligence, so no anon policies are created.
-- A server-side service role may read/write all tables.
grant all on table public.livingdocs_artifacts, public.livingdocs_claims, public.livingdocs_guides, public.livingdocs_findings, public.livingdocs_runs, public.livingdocs_state to service_role;
grant usage, select on sequence public.livingdocs_runs_seq_seq to service_role;
