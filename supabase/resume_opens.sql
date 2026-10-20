-- Resume link opens: what the Ops Console "Resume link opens" table reads.
-- Safe to run again. Needs the events, resume_links and applications tables, and visit_machine
-- (supabase/machine_visits.sql).
--
-- Every resume and cover letter links to /brief?r=<code>. analytics.js saves the code with
-- each event of that tab. This view groups those events per code and labels each visit:
--   scan         2+ pages loaded within 1 s (every link in the PDF at once; no person does that), or a
--                quiet visit from a machine browser (see machine_visits.sql)
--   person       clicked or typed or scrolled (engaged, brief_cta, resume, contact, project) or came back another day
--   likely_scan  one quiet visit within 10 min of sending (tracker applied_at or created_at, joined on job_url)
--   unclear      one quiet visit with no send time to compare against
-- Found 2026-10-17: every LinkedIn Easy Apply resume link gets opened by a machine in the same
-- minute as the application, so a plain open count reads as recruiter interest when it is not.

-- Browsers that belong to Pranav. Their visits never count. ?me=1 stops new events from a
-- browser; this table covers history already recorded and browsers that never had ?me=1.
CREATE TABLE IF NOT EXISTS public.own_sessions (
  session_id text PRIMARY KEY,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.own_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin reads own_sessions" ON public.own_sessions;
CREATE POLICY "admin reads own_sessions" ON public.own_sessions FOR SELECT TO authenticated USING (true);
REVOKE ALL ON public.own_sessions FROM anon;
GRANT SELECT ON public.own_sessions TO authenticated;

CREATE INDEX IF NOT EXISTS events_session_idx ON public.events (session_id);

CREATE OR REPLACE VIEW public.v_resume_opens WITH (security_invoker = true) AS
 WITH tagged AS (
   -- the first code each browser carried, and when
   SELECT DISTINCT ON (session_id) session_id, lower(meta ->> 'r') AS code, created_at AS coded_at
   FROM events
   WHERE meta ? 'r' AND COALESCE(session_id, '') <> ''
   ORDER BY session_id, created_at, lower(meta ->> 'r')
 ), ev AS (
   -- an event keeps its own code; otherwise it takes the browser's code, but only from 2 s
   -- before that code first showed up (other tabs opened from the same PDF land a few ms early)
   SELECT e.id, e.type, e.path, e.session_id, e.meta, e.created_at,
          COALESCE(lower(e.meta ->> 'r'),
                   CASE WHEN e.created_at >= t.coded_at - interval '2 seconds' THEN t.code END) AS code
   FROM events e
   LEFT JOIN tagged t ON t.session_id = e.session_id AND COALESCE(e.session_id, '') <> ''
   WHERE NOT EXISTS (SELECT 1 FROM own_sessions o WHERE o.session_id = e.session_id)
 ), pv AS (
   SELECT code, session_id,
          created_at - lag(created_at) OVER (PARTITION BY code, session_id ORDER BY created_at) AS gap
   FROM ev WHERE type = 'pageview' AND code IS NOT NULL
 ), visits AS (
   SELECT ev.code, ev.session_id, min(ev.created_at) AS started,
     count(DISTINCT (ev.created_at AT TIME ZONE 'America/New_York')::date) AS days,
     bool_or(ev.type IN ('engaged', 'brief_cta', 'resume_download', 'contact_click', 'contact_submit', 'project_click')) AS acted,
     EXISTS (SELECT 1 FROM pv WHERE pv.code = ev.code AND pv.session_id = ev.session_id
                                AND pv.gap < interval '1 second') AS burst,
     bool_or(CASE WHEN ev.type = 'pageview' THEN public.visit_machine(ev.meta) END IS NOT NULL) AS machine
   FROM ev WHERE ev.code IS NOT NULL
   GROUP BY ev.code, ev.session_id
 ), labeled AS (
   SELECT v.code, v.session_id, CASE
     WHEN v.burst THEN 'scan'
     WHEN v.acted THEN 'person'
     WHEN v.machine THEN 'scan'
     WHEN v.days > 1 THEN 'person'
     WHEN EXISTS (
       SELECT 1 FROM resume_links l JOIN applications a ON a.job_url = l.job_url
       WHERE l.code = v.code AND COALESCE(l.job_url, '') <> ''
         AND (abs(extract(epoch FROM v.started - a.applied_at)) <= 600
              OR abs(extract(epoch FROM v.started - a.created_at)) <= 600)
     ) THEN 'likely_scan'
     ELSE 'unclear' END AS kind
   FROM visits v
 ), kinds AS (
   SELECT code,
     count(*) FILTER (WHERE kind = 'scan') AS scan_visits,
     count(*) FILTER (WHERE kind = 'likely_scan') AS likely_scan_visits,
     count(*) FILTER (WHERE kind = 'person') AS person_visits,
     count(*) FILTER (WHERE kind = 'unclear') AS unclear_visits
   FROM labeled GROUP BY code
 ), agg AS (
   SELECT ev.code,
     min(ev.created_at) FILTER (WHERE ev.type = 'pageview') AS first_open,
     max(ev.created_at) AS last_seen,
     count(*) FILTER (WHERE ev.type = 'pageview') AS views,
     count(DISTINCT NULLIF(ev.session_id, '')) AS visitors,
     count(DISTINCT (ev.created_at AT TIME ZONE 'America/New_York')::date) AS days_seen,
     COALESCE(sum(CASE WHEN ev.type = 'page_time' AND (ev.meta ->> 'seconds') ~ '^[0-9]+([.][0-9]+)?$' THEN round((ev.meta ->> 'seconds')::numeric) ELSE NULL END), 0)::integer AS seconds,
     count(*) FILTER (WHERE ev.type = 'resume_download') AS resume_clicks,
     count(*) FILTER (WHERE ev.type = 'project_click') AS project_clicks,
     count(*) FILTER (WHERE ev.type = ANY (ARRAY['contact_click', 'contact_submit'])
                        OR (ev.type = 'brief_cta' AND ev.meta ->> 'target' IN ('email', 'phone', 'linkedin', 'bar_email'))) AS contact_clicks,
     COALESCE(bool_or(CASE WHEN ev.type = 'pageview' THEN public.visit_machine(ev.meta) END = 'bot'
                      OR (ev.meta ->> 'bot') = '1'), false) AS automated
   FROM ev WHERE ev.code IS NOT NULL GROUP BY ev.code
 )
 SELECT a.code, a.first_open, a.last_seen, a.views, a.visitors, a.days_seen, a.seconds,
        a.resume_clicks, a.project_clicks, a.contact_clicks, a.automated,
        l.doc, l.source, l.built_on, l.company, l.role, l.role_family, l.job_id, l.job_url, l.variant,
        k.scan_visits, k.likely_scan_visits, k.person_visits, k.unclear_visits
 FROM agg a
 JOIN kinds k ON k.code = a.code
 LEFT JOIN resume_links l ON l.code = a.code;
