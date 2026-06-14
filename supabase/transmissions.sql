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
