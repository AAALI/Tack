-- =====================================================================
-- Team Boards — Supabase schema
-- Run this once in the Supabase SQL editor (Dashboard > SQL > New query).
-- Safe to re-run: drops are guarded.
-- =====================================================================

-- ---------- Tables ----------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz not null default now()
);

create table if not exists public.boards (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  prefix      text not null default 'BRD',
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint  boards_prefix_format check (prefix ~ '^[A-Z0-9]{3}$')
);

create table if not exists public.board_members (
  board_id    uuid not null references public.boards (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'member' check (role in ('owner', 'member')),
  created_at  timestamptz not null default now(),
  primary key (board_id, user_id)
);

create table if not exists public.columns (
  id          uuid primary key default gen_random_uuid(),
  board_id    uuid not null references public.boards (id) on delete cascade,
  title       text not null default 'New stage',
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.cards (
  id          uuid primary key default gen_random_uuid(),
  board_id    uuid not null references public.boards (id) on delete cascade,
  column_id   uuid not null references public.columns (id) on delete cascade,
  number      int  not null,                  -- per-board monotonic; filled by trigger
  title       text not null,
  description text not null default '',
  assignee    uuid references auth.users (id) on delete set null,
  due_date    date,
  priority    text not null default 'none' check (priority in ('none','low','medium','high')),
  labels      text[] not null default '{}',
  links       jsonb  not null default '[]',   -- [{ "label": "...", "url": "..." }]
  position    int    not null default 0,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.card_events (
  id          uuid primary key default gen_random_uuid(),
  card_id     uuid not null references public.cards (id)  on delete cascade,
  board_id    uuid not null references public.boards (id) on delete cascade,
  actor       uuid references auth.users (id) on delete set null,
  kind        text not null check (kind in ('created', 'moved', 'updated')),
  payload     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists cards_board_idx   on public.cards (board_id);
create index if not exists cards_column_idx  on public.cards (column_id);
create index if not exists columns_board_idx on public.columns (board_id);
create unique index if not exists cards_board_number_uniq on public.cards (board_id, number);
create index if not exists card_events_card_idx  on public.card_events (card_id, created_at desc);
create index if not exists card_events_board_idx on public.card_events (board_id);

-- ---------- Trigger: auto-assign per-board card number ----------
-- BEFORE INSERT so the row carries its number before any constraint check.
-- Caller may pre-supply `number` (tests/imports); the unique index enforces sanity.

create or replace function public.assign_card_number()
returns trigger
language plpgsql
as $$
begin
  if new.number is null then
    select coalesce(max(number), 0) + 1
      into new.number
      from public.cards
     where board_id = new.board_id;
  end if;
  return new;
end;
$$;

drop trigger if exists cards_assign_number on public.cards;
create trigger cards_assign_number
  before insert on public.cards
  for each row execute function public.assign_card_number();

-- ---------- Trigger: append-only card activity log ----------
-- Records create / move / field-edit events. SECURITY DEFINER so its writes
-- bypass the read-only RLS on card_events (only this trigger ever writes).
-- DELETE is not logged — the card and its events cascade away together.

create or replace function public.log_card_event()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  changed text[] := '{}';
begin
  if tg_op = 'INSERT' then
    insert into public.card_events (card_id, board_id, actor, kind)
    values (new.id, new.board_id, auth.uid(), 'created');
    return new;
  end if;

  if new.column_id is distinct from old.column_id then
    insert into public.card_events (card_id, board_id, actor, kind, payload)
    values (
      new.id, new.board_id, auth.uid(), 'moved',
      jsonb_build_object(
        'from', (select title from public.columns where id = old.column_id),
        'to',   (select title from public.columns where id = new.column_id)
      )
    );
  end if;

  if new.title       is distinct from old.title       then changed := changed || 'title';       end if;
  if new.description is distinct from old.description  then changed := changed || 'description'; end if;
  if new.assignee    is distinct from old.assignee    then changed := changed || 'assignee';    end if;
  if new.due_date    is distinct from old.due_date    then changed := changed || 'due date';    end if;
  if new.priority    is distinct from old.priority     then changed := changed || 'priority';     end if;
  if new.labels      is distinct from old.labels       then changed := changed || 'labels';       end if;
  if new.links       is distinct from old.links        then changed := changed || 'links';        end if;

  if array_length(changed, 1) > 0 then
    insert into public.card_events (card_id, board_id, actor, kind, payload)
    values (new.id, new.board_id, auth.uid(), 'updated',
            jsonb_build_object('fields', changed));
  end if;

  return new;
end;
$$;

drop trigger if exists cards_log_event on public.cards;
create trigger cards_log_event
  after insert or update on public.cards
  for each row execute function public.log_card_event();

-- ---------- New-user profile trigger ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Membership helpers (security definer = no RLS recursion) ----------

create or replace function public.is_board_member(b uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.board_members
    where board_id = b and user_id = auth.uid()
  );
$$;

create or replace function public.is_board_owner(b uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.board_members
    where board_id = b and user_id = auth.uid() and role = 'owner'
  );
$$;

-- Viewer shares a board with the given user. Used to scope `profiles_read`.
-- SECURITY DEFINER so the policy doesn't recurse through board_members's own
-- policies during the visibility check.
create or replace function public.shares_board_with(other_user uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
      from public.board_members a
      join public.board_members b on a.board_id = b.board_id
     where a.user_id = auth.uid()
       and b.user_id = other_user
  );
$$;

-- The shares_board_with join filters by b.user_id; PK is (board_id, user_id)
-- which doesn't help that lookup. Add the single-column index.
create index if not exists board_members_user_idx on public.board_members (user_id);

-- ---------- RPC: create a board with default stages ----------

create or replace function public.create_board(board_name text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.boards (name, prefix, created_by)
  values (
    board_name,
    -- Derive an exactly-3-char [A-Z0-9] prefix from the name; fall back to 'BRD'.
    (select rpad(d, 3, 'X')
       from (select coalesce(
                      nullif(substring(upper(regexp_replace(board_name, '[^A-Za-z0-9]', '', 'g')) from 1 for 3), ''),
                      'BRD') as d) s),
    auth.uid()
  )
  returning id into new_id;

  insert into public.board_members (board_id, user_id, role)
  values (new_id, auth.uid(), 'owner');

  insert into public.columns (board_id, title, position) values
    (new_id, 'Backlog', 0),
    (new_id, 'To Do', 1),
    (new_id, 'In Progress', 2),
    (new_id, 'Done', 3);

  return new_id;
end;
$$;

-- ---------- RPC: add a member by email (owner only) ----------

create or replace function public.add_board_member(board uuid, member_email text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  target uuid;
begin
  if not public.is_board_owner(board) then
    raise exception 'Only an owner can add members';
  end if;

  select id into target from public.profiles where lower(email) = lower(member_email);
  if target is null then
    raise exception 'No user with that email has signed in yet';
  end if;

  insert into public.board_members (board_id, user_id, role)
  values (board, target, 'member')
  on conflict (board_id, user_id) do nothing;
end;
$$;

-- ---------- Grants (table-level; RLS still enforces row visibility) ----------
-- Without these, `authenticated` gets `42501 permission denied`; RLS never runs.

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.boards,
  public.board_members,
  public.columns,
  public.cards
to authenticated;

-- card_events is read-only for clients; the SECURITY DEFINER trigger writes it.
grant select on public.card_events to authenticated;

grant select, update on public.profiles to authenticated;

grant usage, select on all sequences in schema public to authenticated;

-- ---------- Enable RLS ----------

alter table public.profiles      enable row level security;
alter table public.boards        enable row level security;
alter table public.board_members enable row level security;
alter table public.columns       enable row level security;
alter table public.cards         enable row level security;
alter table public.card_events   enable row level security;

-- ---------- Policies ----------

-- profiles: self + co-members can read names (to render assignees/members); edit own.
-- `add_board_member` is SECURITY DEFINER and does its own profile lookup, so
-- inviting a stranger by email still works even though the inviter can't
-- `select` that profile through this policy.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_board_with(id));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- boards: members read; owners update/delete; creator may insert
drop policy if exists boards_read on public.boards;
create policy boards_read on public.boards
  for select to authenticated using (public.is_board_member(id));

drop policy if exists boards_insert on public.boards;
create policy boards_insert on public.boards
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists boards_modify on public.boards;
create policy boards_modify on public.boards
  for update to authenticated using (public.is_board_owner(id));

drop policy if exists boards_delete on public.boards;
create policy boards_delete on public.boards
  for delete to authenticated using (public.is_board_owner(id));

-- board_members: members can see who else is on their boards; owners manage
drop policy if exists members_read on public.board_members;
create policy members_read on public.board_members
  for select to authenticated using (public.is_board_member(board_id));

drop policy if exists members_insert on public.board_members;
create policy members_insert on public.board_members
  for insert to authenticated with check (public.is_board_owner(board_id));

drop policy if exists members_delete on public.board_members;
create policy members_delete on public.board_members
  for delete to authenticated using (public.is_board_owner(board_id));

-- columns: full access for board members
drop policy if exists columns_all on public.columns;
create policy columns_all on public.columns
  for all to authenticated
  using (public.is_board_member(board_id))
  with check (public.is_board_member(board_id));

-- cards: full access for board members
drop policy if exists cards_all on public.cards;
create policy cards_all on public.cards
  for all to authenticated
  using (public.is_board_member(board_id))
  with check (public.is_board_member(board_id));

-- card_events: members read; nobody writes through the API (trigger-only).
drop policy if exists card_events_read on public.card_events;
create policy card_events_read on public.card_events
  for select to authenticated using (public.is_board_member(board_id));

-- ---------- Realtime ----------
-- Let board members receive live updates. RLS still applies to the stream.
alter publication supabase_realtime add table public.cards;
alter publication supabase_realtime add table public.columns;
alter publication supabase_realtime add table public.card_events;
