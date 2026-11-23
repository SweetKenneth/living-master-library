-- Optional server-side schema for LivingRoadmap. The default adapter is local JSON.
create table if not exists livingroadmap_items (id text primary key, payload jsonb not null, updated_at timestamptz not null default now());
create table if not exists livingroadmap_runs (id bigserial primary key, at timestamptz not null, outcome text not null, receipt_hash text unique not null, prev_hash text unique not null, payload jsonb not null);
