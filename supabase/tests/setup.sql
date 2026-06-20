-- =====================================================================
-- Test scaffolding
-- ---------------------------------------------------------------------
-- `supabase/schema.sql` is written for a real Supabase project, so it
-- assumes a few things the platform provides: the `authenticated` /
-- `anon` roles, an `auth` schema with `auth.users` + `auth.uid()`, and
-- the `supabase_realtime` publication. A bare Postgres (local or CI) has
-- none of these.
--
-- This file stands those up so `schema.sql` applies unchanged and the
-- pgTAP suite in `tests/database/` can exercise the real RLS policies.
-- It is the source of truth for "what Supabase gives us" in tests — keep
-- it minimal; only add what a policy/trigger actually touches.
-- =====================================================================

create extension if not exists pgtap;

-- Platform roles. RLS policies target `authenticated`; tests `set role` to it.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;

-- Minimal auth schema. The new-user trigger fires on inserts here, and
-- auth.uid() reads the JWT sub that tests set via `request.jwt.claim.sub`.
create schema if not exists auth;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb not null default '{}'
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- Realtime publication that schema.sql adds tables to.
do $$ begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
