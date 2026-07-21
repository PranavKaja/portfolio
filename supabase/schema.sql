-- ============================================================
-- Ops Console: Projects schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: drops/recreates policies, leaves data intact.
-- ============================================================

-- Status badge values shown on the live dossier grid.
do $$ begin
  create type project_status as enum ('deployed', 'in_progress', 'archived', 'classified', 'none');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,                 -- e.g. 'MSN-04'
  title       text not null,
  tech        text not null default '',             -- short stack line on the card
  summary     text not null default '',             -- one-liner on the card ("desc")
  stack       text not null default '',             -- full stack line in the overlay
  hook        text not null default '',
  brief       text not null default '',
  role        text not null default '',
  method      text not null default '',
  outcome     text not null default '',
  chips       text[] not null default '{}',         -- metric chips
  skills      text[] not null default '{}',         -- skills shown on the card hover panel
  status      project_status not null default 'deployed',
  status_label text,                                -- overrides the status pill text, e.g. 'LIVE TOOL'
  show_status boolean not null default true,        -- false = no status pill on the card
  github_url  text,                                 -- repo, or the live page for link_type 'site'
  show_github boolean not null default true,
  link_type   text not null default 'github',       -- 'github' or 'site' (picks the icon and label)
  sort_order  int not null default 0,               -- grid order (low first)
  published   boolean not null default true,        -- false = hidden from the public site
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- columns added after the first build; kept here so re-running stays idempotent
alter table public.projects add column if not exists skills       text[] not null default '{}';
alter table public.projects add column if not exists status_label text;
alter table public.projects add column if not exists show_status  boolean not null default true;
alter table public.projects add column if not exists github_url   text;
alter table public.projects add column if not exists show_github  boolean not null default true;
alter table public.projects add column if not exists link_type    text not null default 'github';

create index if not exists projects_sort_idx on public.projects (sort_order);

-- keep updated_at fresh on every edit
-- search_path is pinned (not role-mutable) to satisfy the Supabase security linter
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security
--   • anyone (anon) may READ published projects  -> powers the live site
--   • signed-in admin may READ everything and WRITE
-- ============================================================
alter table public.projects enable row level security;

drop policy if exists "public reads published" on public.projects;
create policy "public reads published"
  on public.projects for select
  to anon
  using (published = true);

drop policy if exists "admin reads all" on public.projects;
create policy "admin reads all"
  on public.projects for select
  to authenticated
  using (true);

drop policy if exists "admin inserts" on public.projects;
create policy "admin inserts"
  on public.projects for insert
  to authenticated
  with check (true);

drop policy if exists "admin updates" on public.projects;
create policy "admin updates"
  on public.projects for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "admin deletes" on public.projects;
create policy "admin deletes"
  on public.projects for delete
  to authenticated
  using (true);
