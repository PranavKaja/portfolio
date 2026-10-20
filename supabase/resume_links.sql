-- log_resume_links: how the career hub's link builder (13-Jobs/engine/brieflink.py) pushes the
-- codes it issues into resume_links, so the Ops Console can put a company and role beside a visit.
-- Safe to run again. Until 2026-10-20 the database was this function's only copy.
--
-- Two code shapes are accepted, because both are printed on resumes already sent:
--   long  (2026-10-11): rli61019-wz7ve-sl7pw   document, source, year digit + month + day,
--                                              5-character company key, family, role key, check
--   short (2026-10-20): rli93wz7sl7pn          document, source, 2-character day count,
--                                              3-character company key, family, role key, check
-- A row whose code fits neither shape is skipped without an error, as before.

CREATE OR REPLACE FUNCTION public.log_resume_links(p_token text, p_rows jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_owner uuid;
  v_n     integer := 0;
  r       jsonb;
begin
  select owner_id into v_owner
  from public.job_engine_auth
  where id = 1
    and token_hash = encode(digest(p_token, 'sha256'), 'hex');

  if v_owner is null then
    raise exception 'unauthorized';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 1000 then
    raise exception 'p_rows must be an array of at most 1000 rows';
  end if;

  for r in select value from jsonb_array_elements(p_rows) loop
    continue when coalesce(r->>'code', '') !~
      '^([a-z][a-z]{2}[0-9]{5}-[0-9a-z]{5}-[a-z]{2}[0-9a-z]{3}|[a-z][a-z]{2}[0-9a-z]{5}[a-z]{2}[0-9a-z]{3})$';

    insert into public.resume_links
      (code, user_id, doc, source, built_on, company, company_key, role,
       role_family, role_key, job_id, job_url, variant)
    values
      (r->>'code', v_owner,
       left(coalesce(nullif(r->>'doc', ''), 'o'), 1),
       left(coalesce(nullif(r->>'source', ''), 'xx'), 2),
       case when r->>'built_on' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then (r->>'built_on')::date end,
       left(coalesce(r->>'company', ''), 200),
       left(coalesce(nullif(r->>'company_key', ''), '00000'), 5),
       left(coalesce(r->>'role', ''), 200),
       left(coalesce(nullif(r->>'family', ''), 'ot'), 2),
       left(coalesce(nullif(r->>'role_key', ''), '00'), 2),
       left(coalesce(r->>'job_id', ''), 64),
       left(coalesce(r->>'job_url', ''), 500),
       left(coalesce(r->>'variant', ''), 200))
    on conflict (code) do update set
      company    = case when excluded.company <> '' then excluded.company else public.resume_links.company end,
      role       = case when excluded.role    <> '' then excluded.role    else public.resume_links.role end,
      job_id     = case when excluded.job_id  <> '' then excluded.job_id  else public.resume_links.job_id end,
      job_url    = case when excluded.job_url <> '' then excluded.job_url else public.resume_links.job_url end,
      variant    = case when excluded.variant <> '' then excluded.variant else public.resume_links.variant end,
      updated_at = now()
    where public.resume_links.user_id = v_owner;

    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$function$;
