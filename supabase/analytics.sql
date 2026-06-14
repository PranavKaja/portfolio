-- ============================================================
-- Visitor Intel — privacy-preserving analytics
-- Run in the Supabase SQL editor after schema.sql.
-- No PII: anonymous client-generated session ids + normalized traffic
-- sources only. No IP, no name, no cookies (a localStorage id only).
-- ============================================================

create table if not exists public.events (
  id          bigint generated always as identity primary key,
  type        text not null,                  -- pageview | project_click | resume_download | contact_submit | game_score
  path        text not null default '',
  source      text not null default 'Direct', -- normalized traffic source (Google, LinkedIn, Direct, ...)
  session_id  text not null default '',       -- anonymous, generated in the browser
  meta        jsonb not null default '{}',    -- e.g. {"code":"MSN-01"} or {"score":12}
  created_at  timestamptz not null default now()
);
create index if not exists events_type_idx on public.events (type);
create index if not exists events_created_idx on public.events (created_at desc);

alter table public.events enable row level security;

-- the public site may LOG events (size-limited); only the admin may READ them
drop policy if exists "anyone logs events" on public.events;
create policy "anyone logs events"
  on public.events for insert
  to anon, authenticated
  with check (
    char_length(type) between 1 and 40
    and char_length(path) <= 200
    and char_length(source) <= 80
    and char_length(session_id) <= 64
    and pg_column_size(meta) <= 2000
  );

drop policy if exists "admin reads events" on public.events;
create policy "admin reads events"
  on public.events for select to authenticated using (true);

drop policy if exists "admin clears events" on public.events;
create policy "admin clears events"
  on public.events for delete to authenticated using (true);

-- ============================================================
-- One call returns the whole dashboard as JSON.
-- SECURITY INVOKER + execute granted only to `authenticated`, so the public
-- can WRITE events but can never READ the analytics back.
-- ============================================================
create or replace function public.intel_dashboard()
returns json
language sql
security invoker
set search_path = pg_catalog, public
stable
as $$
  select json_build_object(
    'kpis', (
      select json_build_object(
        'total_views',      count(*) filter (where type = 'pageview'),
        'unique_visitors',  count(distinct session_id) filter (where type = 'pageview' and session_id <> ''),
        'project_clicks',   count(*) filter (where type = 'project_click'),
        'resume_downloads', count(*) filter (where type = 'resume_download'),
        'contact_submits',  count(*) filter (where type = 'contact_submit'),
        'game_plays',       count(*) filter (where type = 'game_score')
      ) from public.events
    ),
    'traffic', (
      select coalesce(json_agg(t), '[]'::json) from (
        select source, count(*) as n
        from public.events where type = 'pageview'
        group by source order by n desc limit 8
      ) t
    ),
    'top_projects', (
      select coalesce(json_agg(p), '[]'::json) from (
        select meta->>'code' as code, max(meta->>'title') as title, count(*) as n
        from public.events
        where type = 'project_click' and (meta->>'code') is not null
        group by meta->>'code' order by n desc limit 10
      ) p
    ),
    'top_pages', (
      select coalesce(json_agg(pg), '[]'::json) from (
        select path, count(*) as n
        from public.events where type = 'pageview'
        group by path order by n desc limit 8
      ) pg
    ),
    'daily', (
      select coalesce(json_agg(d order by d.day), '[]'::json) from (
        select to_char(created_at, 'YYYY-MM-DD') as day, count(*) as n
        from public.events
        where type = 'pageview' and created_at > now() - interval '30 days'
        group by 1
      ) d
    ),
    'game', (
      select json_build_object(
        'plays', count(*),
        'high',  coalesce(max((meta->>'score')::int), 0),
        'avg',   coalesce(round(avg((meta->>'score')::numeric), 1), 0)
      ) from public.events where type = 'game_score'
    )
  );
$$;

revoke all on function public.intel_dashboard() from anon, public;
grant execute on function public.intel_dashboard() to authenticated;
