-- ============================================================
-- Visitor Intel — privacy-preserving analytics
-- Run in the Supabase SQL editor after schema.sql.
-- No PII: anonymous client-generated session ids + normalized traffic
-- sources only. No IP, no name, no cookies (a localStorage id only).
-- ============================================================

create table if not exists public.events (
  id          bigint generated always as identity primary key,
  type        text not null,                  -- pageview | project_click | resume_download | contact_submit | game_score | page_time
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
    -- numeric fields the dashboard casts must actually be numeric (or absent),
    -- else a crafted event would break intel_dashboard()'s ::int/::numeric casts
    and (meta->'score'   is null or (meta->>'score')   ~ '^[0-9]+$')
    and (meta->'seconds' is null or (meta->>'seconds') ~ '^[0-9]+([.][0-9]+)?$')
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
-- p_since filters every aggregate to created_at >= p_since (null = all time).
-- The Intel dashboard's global range filter passes this; `daily` stays a full
-- 365-day series so the time-series drilldown keeps its own range buttons.
drop function if exists public.intel_dashboard();

create or replace function public.intel_dashboard(p_since timestamptz default null)
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
        'contact_clicks',   count(*) filter (where type = 'contact_click'),
        'contact_submits',  count(*) filter (where type = 'contact_submit'),
        'game_plays',       count(*) filter (where type = 'game_score'),
        'avg_time',         (
          select coalesce(round(avg(s.t)), 0) from (
            select session_id, sum((meta->>'seconds')::numeric) as t
            from public.events
            where type = 'page_time' and session_id <> '' and (meta->>'seconds') ~ '^[0-9]+([.][0-9]+)?$'
              and (p_since is null or created_at >= p_since)
            group by session_id
          ) s
        )
      ) from public.events
      where (p_since is null or created_at >= p_since)
    ),
    'traffic', (
      select coalesce(json_agg(t), '[]'::json) from (
        select source, count(*) as n
        from public.events where type = 'pageview' and (p_since is null or created_at >= p_since)
        group by source order by n desc limit 8
      ) t
    ),
    'top_projects', (
      select coalesce(json_agg(p), '[]'::json) from (
        select meta->>'code' as code, max(meta->>'title') as title, count(*) as n
        from public.events
        where type = 'project_click' and (meta->>'code') is not null and (p_since is null or created_at >= p_since)
        group by meta->>'code' order by n desc limit 10
      ) p
    ),
    'top_pages', (
      select coalesce(json_agg(pg), '[]'::json) from (
        select v.path, v.n, coalesce(round(t.avg_sec), 0) as avg_sec
        from (
          select path, count(*) as n
          from public.events where type = 'pageview' and (p_since is null or created_at >= p_since)
          group by path order by n desc limit 12
        ) v
        left join (
          select path, avg((meta->>'seconds')::numeric) as avg_sec
          from public.events where type = 'page_time' and (meta->>'seconds') ~ '^[0-9]+([.][0-9]+)?$'
            and (p_since is null or created_at >= p_since)
          group by path
        ) t on t.path = v.path
        order by v.n desc
      ) pg
    ),
    'daily', (
      select coalesce(json_agg(d order by d.day), '[]'::json) from (
        select to_char(created_at at time zone 'America/New_York', 'YYYY-MM-DD') as day,
               count(*) filter (where type = 'pageview') as views,
               count(*) filter (where type = 'game_score' or type = 'ttt_match') as game_plays,
               count(*) filter (where type = 'resume_download') as downloads,
               count(*) filter (where type = 'contact_click') as contact_clicks,
               coalesce(sum((meta->>'seconds')::numeric) filter (where type = 'page_time' and (meta->>'seconds') ~ '^[0-9]+([.][0-9]+)?$'), 0) as time_sec
        from public.events
        where created_at > now() - interval '365 days'
        group by 1
      ) d
    ),
    'game', (
      select json_build_object(
        'plays',   count(*),
        'players', count(distinct session_id) filter (where session_id <> ''),
        'high',    coalesce(max((meta->>'score')::int) filter (where (meta->>'score') ~ '^[0-9]+$'), 0),
        'avg',     coalesce(round(avg((meta->>'score')::numeric) filter (where (meta->>'score') ~ '^[0-9]+$'), 1), 0)
      ) from public.events where type = 'game_score' and (p_since is null or created_at >= p_since)
    ),
    'tictactoe', (
      select json_build_object(
        'plays', count(*),
        'players', count(distinct session_id) filter (where session_id <> ''),
        'user_wins', count(*) filter (where meta->>'result' = 'U'),
        'system_wins', count(*) filter (where meta->>'result' = 'P'),
        'draws', count(*) filter (where meta->>'result' = 'D')
      ) from public.events where type = 'ttt_match' and (p_since is null or created_at >= p_since)
    ),
    -- one row per distinct anonymous player, their best score + how many times they played
    'leaderboard', (
      select coalesce(json_agg(l), '[]'::json) from (
        select left(session_id, 6) as player,
               max((meta->>'score')::int) as best,
               count(*) as plays
        from public.events
        where type = 'game_score' and session_id <> '' and (meta->>'score') ~ '^[0-9]+$'
          and (p_since is null or created_at >= p_since)
        group by session_id
        order by best desc
        limit 10
      ) l
    )
  );
$$;

revoke all on function public.intel_dashboard(timestamptz) from anon, public;
grant execute on function public.intel_dashboard(timestamptz) to authenticated;
