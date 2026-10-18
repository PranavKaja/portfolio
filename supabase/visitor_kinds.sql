-- Visitor kinds: which browsers on the site are people, and which are machines or Pranav.
-- Safe to run again. Needs events, applications and own_sessions (supabase/resume_opens.sql).
--
-- One label per browser (session_id is a random id kept per browser):
--   owner    Pranav: listed in own_sessions, or loaded a local .html dev copy of a page
--   bot      flagged bot=1 by analytics.js, a headless browser, or events with no page view
--   scanner  the application link scanner: 2+ pages loaded within 1 s, or a quiet one-day visit that
--            started within 1.5 s of another new browser, or within 3 min of an application being sent
--   ping     one page, 0 visible seconds, nothing else: prefetch and uptime checks (and instant bounces)
--   visitor  everything else
-- "Quiet" means no click, key, scroll, resume download, contact, project or game event.
-- Found 2026-10-17: about 9 in 10 browsers since Oct 1 were the scanner, not people.

CREATE OR REPLACE VIEW public.v_session_kinds WITH (security_invoker = true) AS
 WITH s AS (
   SELECT session_id,
     min(created_at) AS first_at,
     max(created_at) AS last_at,
     min(created_at) FILTER (WHERE type = 'pageview') AS first_pv,
     count(*) FILTER (WHERE type = 'pageview') AS pv,
     count(DISTINCT (created_at AT TIME ZONE 'America/New_York')::date) AS days,
     bool_or(type IN ('engaged', 'brief_cta', 'resume_download', 'contact_click', 'contact_submit',
                      'project_click', 'game_score', 'ttt_match')) AS acted,
     bool_or(meta ->> 'bot' = '1' OR meta ->> 'ua' ILIKE '%headless%') AS botflag,
     bool_or(type = 'pageview' AND path LIKE '%.html') AS devcopy,
     COALESCE(sum((meta ->> 'seconds')::numeric) FILTER (WHERE type = 'page_time'
              AND (meta ->> 'seconds') ~ '^[0-9]+([.][0-9]+)?$'), 0) AS secs
   FROM events
   WHERE COALESCE(session_id, '') <> ''
   GROUP BY session_id
 ), near AS (
   -- seconds to the nearest other browser's first page view (scanner tabs open together)
   SELECT session_id, least(
       extract(epoch FROM first_pv - lag(first_pv) OVER (ORDER BY first_pv)),
       extract(epoch FROM lead(first_pv) OVER (ORDER BY first_pv) - first_pv)) AS gap
   FROM s WHERE first_pv IS NOT NULL
 ), apps AS MATERIALIZED (
   -- read once, so the tracker's row security runs once, not once per browser
   SELECT applied_at AS t FROM applications WHERE applied_at IS NOT NULL
   UNION ALL SELECT created_at FROM applications WHERE created_at IS NOT NULL
 ), burst AS (
   SELECT DISTINCT session_id FROM (
     SELECT session_id, created_at - lag(created_at) OVER (PARTITION BY session_id ORDER BY created_at) AS gap
     FROM events WHERE type = 'pageview'
   ) x WHERE gap < interval '1 second'
 )
 SELECT s.session_id, s.first_at, s.last_at, s.pv,
   CASE
     WHEN s.devcopy OR EXISTS (SELECT 1 FROM own_sessions o WHERE o.session_id = s.session_id) THEN 'owner'
     WHEN s.botflag OR s.pv = 0 THEN 'bot'
     WHEN EXISTS (SELECT 1 FROM burst b WHERE b.session_id = s.session_id) THEN 'scanner'
     WHEN s.days = 1 AND NOT s.acted AND EXISTS (
       SELECT 1 FROM near n WHERE n.session_id = s.session_id AND n.gap < 1.5) THEN 'scanner'
     WHEN s.days = 1 AND NOT s.acted AND EXISTS (
       SELECT 1 FROM apps a WHERE a.t BETWEEN s.first_at - interval '3 minutes' AND s.first_at + interval '3 minutes') THEN 'scanner'
     WHEN s.pv = 1 AND s.secs = 0 AND NOT s.acted THEN 'ping'
     ELSE 'visitor'
   END AS kind
 FROM s;

-- The Ops Console's Visitor Intel numbers. Same shape as intel_dashboard, but by default it only
-- counts browsers labelled visitor; p_everyone = true counts everything like the old function.
-- Adds 'kinds': browsers per label in the range, so the console can say what it left out.
CREATE OR REPLACE FUNCTION public.intel_dashboard_v2(
  p_since timestamptz DEFAULT NULL, p_until timestamptz DEFAULT NULL, p_everyone boolean DEFAULT false)
 RETURNS json
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  with k as (select session_id, kind from public.v_session_kinds),
  ev as (
    select e.* from public.events e
    where (p_since is null or e.created_at >= p_since) and (p_until is null or e.created_at < p_until)
      and (p_everyone or exists (select 1 from k where k.session_id = e.session_id and k.kind = 'visitor'))
  ),
  ev_year as (
    select e.* from public.events e
    where e.created_at > now() - interval '365 days'
      and (p_everyone or exists (select 1 from k where k.session_id = e.session_id and k.kind = 'visitor'))
  )
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
            from ev
            where type = 'page_time' and session_id <> '' and (meta->>'seconds') ~ '^[0-9]+([.][0-9]+)?$'
            group by session_id
          ) s
        )
      ) from ev
    ),
    'kinds', (
      select coalesce(json_object_agg(kind, n), '{}'::json) from (
        select k.kind, count(*) as n from k
        where exists (select 1 from public.events e where e.session_id = k.session_id
                        and (p_since is null or e.created_at >= p_since) and (p_until is null or e.created_at < p_until))
        group by k.kind
      ) x
    ),
    'traffic', (
      select coalesce(json_agg(t), '[]'::json) from (
        select source, count(*) as n from ev where type = 'pageview'
        group by source order by n desc limit 8
      ) t
    ),
    'top_projects', (
      select coalesce(json_agg(p), '[]'::json) from (
        select meta->>'code' as code, max(meta->>'title') as title, count(*) as n
        from ev where type = 'project_click' and (meta->>'code') is not null
        group by meta->>'code' order by n desc limit 10
      ) p
    ),
    'top_pages', (
      select coalesce(json_agg(pg), '[]'::json) from (
        select v.path, v.n, coalesce(round(t.avg_sec), 0) as avg_sec
        from (
          select path, count(*) as n from ev where type = 'pageview'
          group by path order by n desc limit 12
        ) v
        left join (
          select path, avg((meta->>'seconds')::numeric) as avg_sec
          from ev where type = 'page_time' and (meta->>'seconds') ~ '^[0-9]+([.][0-9]+)?$'
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
        from ev_year
        group by 1
      ) d
    ),
    'game', (
      select json_build_object(
        'plays',   count(*),
        'players', count(distinct session_id) filter (where session_id <> ''),
        'high',    coalesce(max((meta->>'score')::int) filter (where (meta->>'score') ~ '^[0-9]+$'), 0),
        'avg',     coalesce(round(avg((meta->>'score')::numeric) filter (where (meta->>'score') ~ '^[0-9]+$'), 1), 0)
      ) from ev where type = 'game_score'
    ),
    'tictactoe', (
      select json_build_object(
        'plays', count(*),
        'players', count(distinct session_id) filter (where session_id <> ''),
        'user_wins', count(*) filter (where meta->>'result' = 'U'),
        'system_wins', count(*) filter (where meta->>'result' = 'P'),
        'draws', count(*) filter (where meta->>'result' = 'D')
      ) from ev where type = 'ttt_match'
    ),
    'leaderboard', (
      select coalesce(json_agg(l), '[]'::json) from (
        select left(session_id, 6) as player,
               max((meta->>'score')::int) as best,
               count(*) as plays
        from ev
        where type = 'game_score' and session_id <> '' and (meta->>'score') ~ '^[0-9]+$'
        group by session_id
        order by best desc
        limit 10
      ) l
    )
  );
$function$;

REVOKE ALL ON FUNCTION public.intel_dashboard_v2(timestamptz, timestamptz, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.intel_dashboard_v2(timestamptz, timestamptz, boolean) TO authenticated;
