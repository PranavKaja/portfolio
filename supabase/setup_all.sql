-- ============================================================
-- ONE-SHOT SETUP — paste this whole file into the Supabase SQL editor and Run.
-- Runs: schema.sql + seed.sql + transmissions.sql, in order. Safe to re-run.
-- ============================================================

-- >>>>>>>>>>>>>>>>>>>> schema.sql >>>>>>>>>>>>>>>>>>>>
-- ============================================================
-- Ops Console — Projects schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: drops/recreates policies, leaves data intact.
-- ============================================================

-- Status badge values shown on the live dossier grid.
do $$ begin
  create type project_status as enum ('deployed', 'in_progress', 'archived', 'classified');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,                 -- e.g. 'MSN-01'
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
  status      project_status not null default 'deployed',
  sort_order  int not null default 0,               -- grid order (low first)
  published   boolean not null default true,        -- false = hidden from the public site
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists projects_sort_idx on public.projects (sort_order);

-- keep updated_at fresh on every edit
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
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


-- >>>>>>>>>>>>>>>>>>>> seed.sql >>>>>>>>>>>>>>>>>>>>
-- ============================================================
-- Seed the projects table with the 9 current missions.
-- Run AFTER schema.sql. Idempotent: re-running updates existing rows by code.
-- ============================================================

insert into public.projects
  (code, title, tech, summary, stack, hook, brief, role, method, outcome, chips, status, sort_order, published)
values
  ('MSN-01', 'Fraud Triage', 'XGBoost / Gemini',
   '0.978 AUC; caught fraud the base model missed.',
   'XGBoost / Google Gemini / Python',
   'A two-stage pipeline that catches what the model misses.',
   'Built on 284,807 real card transactions. XGBoost scores every transaction at scale; a reasoning layer reviews only the high-risk flags and writes a structured, analyst-ready verdict. Weighted loss took AUC from 0.60 to 0.978, and in testing the second layer caught a fraud the model had scored a perfect 0.000000.',
   'Solo build, end to end',
   'Weighted-loss XGBoost plus a triage layer with strict JSON output',
   'Industry-grade AUC with a reasoning trail analysts can audit',
   array['0.978 AUC','84% Recall','84% Precision','284K Records','~2s Latency'],
   'deployed', 10, true),

  ('MSN-02', 'Corporate Analytics', 'Power BI / SQL',
   '30% faster executive reviews via custom dashboards.',
   'Power BI / DAX / SQL',
   '30% faster executive reviews via custom dashboards.',
   'Executive Power BI dashboards built on live B2B data streams for TapInnovations, replacing a legacy spreadsheet workflow. Custom DAX measures gave leadership direct visibility into cross-functional throughput, and weekly performance reviews accelerated by 30%.',
   'Analyst + stakeholder liaison',
   'Custom DAX measures on live B2B data streams',
   'Weekly executive reviews 30% faster, spreadsheets retired',
   array['30% Faster Reviews','Live B2B Streams','Custom DAX','Exec-Ready'],
   'deployed', 20, true),

  ('MSN-03', 'Heart Disease Prediction', 'Python / Scikit-learn',
   '92% accuracy on 70K+ records; full-stack web app.',
   'Python / Scikit-learn / SHAP / Flask',
   '92% accuracy, deployed as a full-stack interface.',
   'End-to-end capstone on 70,000+ patient records. Ensemble classifiers reached 92% accuracy, with SHAP decomposition exposing the top risk drivers so a clinician could trust the call. Wrapped in a Flask web app for real-time risk scoring.',
   'Capstone lead',
   'Ensemble classification with SHAP decomposition, served via Flask',
   '92% accuracy with per-patient explainability',
   array['92% Accuracy','70K+ Records','SHAP Explainability','Full-Stack'],
   'deployed', 30, true),

  ('MSN-04', 'Hospital Readmission', 'Python / Logistic Regression',
   '73% critical case detection via threshold tuning.',
   'Python / Logistic Regression / SHAP',
   '73% critical-case detection through threshold tuning.',
   'Readmission risk scoring on 25,000 anonymized records. Probability thresholds were tuned to lift critical-case detection to 73% while balancing the precision-recall trade-off. SHAP surfaced inpatient-visit count and age as the dominant predictors, pointing discharge planning at the right patients.',
   'Solo analysis',
   'Logistic regression with tuned probability thresholds',
   '73% of critical cases caught before discharge',
   array['25K Records','73% Detection','SHAP Drivers','Threshold Tuning'],
   'deployed', 40, true),

  ('MSN-05', 'Auto Insurance Churn', 'Gradient Boosting / SMOTE',
   '18% to 11% projected churn reduction.',
   'Scikit-learn / Gradient Boosting / SMOTE',
   '18% to 11% projected churn on 350K policyholders.',
   'Random Forest and Gradient Boosting classifiers on 350,000 policyholder records to flag retention risk. A SMOTE resampling pipeline handled severe class imbalance, holding precision and recall steady across high-risk segments.',
   'Solo build',
   'Random Forest + Gradient Boosting with a SMOTE resampling pipeline',
   'Projected churn cut from 18% to 11%',
   array['350K Records','18% to 11% Churn','SMOTE Pipeline','Class Imbalance'],
   'deployed', 50, true),

  ('MSN-06', 'Supply Chain Opt.', 'HBP Simulation / Python',
   '34% cumulative margin across 4-year horizon.',
   'HBP Simulation / Inventory Strategy',
   '34% cumulative margin across a 4-year horizon.',
   'Managed a simulated global supply chain through four years of high demand volatility. A hybrid sourcing strategy with statistical inventory buffering held a 98% service level with zero stockouts while maximizing gross margin.',
   'Strategy lead',
   'Hybrid sourcing with statistical inventory buffering',
   '34% margin at a 98% service level, zero stockouts',
   array['34% Margin','98% Service Level','Zero Stockouts','Hybrid Sourcing'],
   'archived', 60, true),

  ('MSN-07', 'Bullwhip Mitigation', 'HBP Simulation / Sourcing',
   '54% gross margin under demand volatility.',
   'HBP Simulation / Sourcing Strategy',
   '54% gross margin under demand volatility.',
   'A four-year product lifecycle and supplier risk simulation. Engineered a hybrid sourcing strategy balancing low-cost overseas suppliers against high-flexibility nearshore ones, managing product design upgrades and volatile demand to close at a 54% cumulative gross margin.',
   'Strategy lead',
   'Hybrid sourcing balanced across offshore and nearshore suppliers',
   '54% cumulative gross margin under the bullwhip effect',
   array['54% Gross Margin','Hybrid Sourcing','4-Year Horizon','Supplier Risk'],
   'archived', 70, true),

  ('MSN-08', 'Prime Air Drone Logistics', 'Geospatial / Network Design',
   'Hub-and-spoke last-mile delivery model.',
   'Geospatial Analysis / Network Design',
   'A hub-and-spoke last-mile delivery model.',
   'Last-mile feasibility study for suburban drone delivery in Massachusetts. Demographic and geospatial analysis identified optimal hub placement under payload, flight-range, and urban-restriction constraints, packaged as a 12-month phased rollout designed to cut last-mile lead times.',
   'Network designer',
   'Geospatial and demographic constraint analysis',
   'Suburban hub-and-spoke model with a 12-month rollout plan',
   array['Hub-and-Spoke','Geospatial','12-Month Roadmap','Constraint Model'],
   'in_progress', 80, true),

  ('MSN-09', 'Strategy Summit', 'CAPSIM Simulation / Strategy',
   '483% stock recovery; top-3 of 8 teams.',
   'CAPSIM Simulation / Pricing / Capacity',
   '483% stock recovery, top-3 of 8 teams.',
   'Ran a simulated sensor manufacturer across R&D, marketing, production, and finance for five simulated years. Calibrated pricing tiers and capacity against rate-sensitive demand, recovering the share price from $1.40 to $8.17 and finishing top-3 in cumulative profit. Recognized for an alternating high-tech product strategy.',
   'Team decision lead',
   'Pricing and capacity calibration across 5 simulated years',
   'Share price from $1.40 to $8.17, top-3 cumulative profit',
   array['483% Recovery','$1.40 to $8.17','Top-3 of 8','5 Sim Years'],
   'archived', 90, true)

on conflict (code) do update set
  title = excluded.title, tech = excluded.tech, summary = excluded.summary,
  stack = excluded.stack, hook = excluded.hook, brief = excluded.brief,
  role = excluded.role, method = excluded.method, outcome = excluded.outcome,
  chips = excluded.chips, status = excluded.status,
  sort_order = excluded.sort_order, published = excluded.published;


-- >>>>>>>>>>>>>>>>>>>> transmissions.sql >>>>>>>>>>>>>>>>>>>>
-- ============================================================
-- Transmission Log — inbound contact messages
-- Run once in the Supabase SQL editor (after schema.sql).
-- ============================================================

do $$ begin
  create type message_status as enum ('received', 'decoded', 'replied');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '',
  email       text not null default '',
  phone       text not null default '',
  body        text not null,
  status      message_status not null default 'received',
  flagged     boolean not null default false,      -- priority "reaction" star
  created_at  timestamptz not null default now()
);

create index if not exists messages_created_idx on public.messages (created_at desc);

-- ============================================================
-- Row Level Security
--   • anyone (anon) may SUBMIT a message (insert), with sane size limits,
--     but may NOT read anything back
--   • only the signed-in admin may read / update status / flag / delete
-- ============================================================
alter table public.messages enable row level security;

drop policy if exists "anyone submits" on public.messages;
create policy "anyone submits"
  on public.messages for insert
  to anon, authenticated
  with check (
    char_length(body) between 1 and 5000
    and char_length(coalesce(name, ''))  <= 200
    and char_length(coalesce(email, '')) <= 320
    and char_length(coalesce(phone, '')) <= 50
  );

drop policy if exists "admin reads messages" on public.messages;
create policy "admin reads messages"
  on public.messages for select
  to authenticated
  using (true);

drop policy if exists "admin updates messages" on public.messages;
create policy "admin updates messages"
  on public.messages for update
  to authenticated
  using (true) with check (true);

drop policy if exists "admin deletes messages" on public.messages;
create policy "admin deletes messages"
  on public.messages for delete
  to authenticated
  using (true);
