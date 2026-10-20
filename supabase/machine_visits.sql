-- Machine visits: one check, used by v_session_kinds (visitor_kinds.sql) and v_resume_opens
-- (resume_opens.sql). Run this file before those two. Safe to run again.
--
-- Reads the browser details analytics.js saves on each page view (ua, tz, view, screen) and returns:
--   'bot'      the browser says what it is: bot, crawler, spider, webindexer, headless, preview
--   'machine'  a browser no person would have:
--                window exactly the size of the screen (no toolbars at all), or bigger than the screen
--                time zone UTC or unknown
--                Chrome older than 120 (Chrome updates itself; people run recent versions)
--   null       looks like a person, or the event has no browser details (page views before 2026-10-17)
--
-- The views only use 'machine' for visits that never clicked, typed or scrolled. A visit that acts
-- counts as a person whatever its browser looks like, so a recruiter in full screen is still a person.
-- Found 2026-10-19: every LinkedIn resume open and every recruiter message open since 10-17 came from
-- a Los Angeles browser whose window equals its 1920x1080 screen. The console called some of them people.
--
-- No SET search_path on purpose: it stops Postgres folding the function into the views, which made
-- the check take 318 ms instead of 14 ms. The body only uses built-in operators. Call it on page view
-- rows only (the other event types carry no browser details).

CREATE OR REPLACE FUNCTION public.visit_machine(m jsonb)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE
    WHEN m IS NULL THEN NULL
    WHEN m ->> 'bot' = '1'
      OR m ->> 'ua' ~* '(bot|crawl|spider|slurp|webindexer|headless|facebookexternalhit|preview|lighthouse)' THEN 'bot'
    WHEN m ->> 'tz' IN ('UTC', 'Etc/UTC', 'Etc/GMT', 'Etc/Unknown') THEN 'machine'
    WHEN substring(m ->> 'ua' from 'Chrome/([0-9]+)[.]')::int < 120 THEN 'machine'
    WHEN m ->> 'view' ~ '^[0-9]+x[0-9]+$' AND m ->> 'screen' ~ '^[1-9][0-9]*x[1-9][0-9]*$' AND (
         m ->> 'view' = m ->> 'screen'
         OR split_part(m ->> 'view', 'x', 1)::int > split_part(m ->> 'screen', 'x', 1)::int
         OR split_part(m ->> 'view', 'x', 2)::int > split_part(m ->> 'screen', 'x', 2)::int) THEN 'machine'
  END
$function$;
