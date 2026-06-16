-- =====================================================================
-- 0001 — Card identifiers (BOARD-123)
-- ---------------------------------------------------------------------
-- Adds:
--   - boards.prefix  : 2–6 char [A-Z0-9] tag derived from board name
--   - cards.number   : per-board monotonic int auto-assigned by trigger
-- And updates the create_board RPC to set prefix on new boards.
-- ---------------------------------------------------------------------
-- Safe to run against an existing install. Idempotent where possible.
-- =====================================================================

-- ---------- Columns ----------

alter table public.boards add column if not exists prefix text;
alter table public.cards  add column if not exists number int;

-- ---------- Backfill existing rows ----------

-- Number existing cards per board, ordered by created_at then id for stability.
update public.cards c
   set number = sub.rn
  from (
    select id,
           row_number() over (partition by board_id order by created_at, id) as rn
      from public.cards
  ) sub
 where c.id = sub.id
   and c.number is null;

-- Derive a prefix from each board name (first alphanumerics, uppercased, 2–6 chars).
update public.boards
   set prefix = coalesce(
     nullif(substring(upper(regexp_replace(name, '[^A-Za-z0-9]', '', 'g')) from 1 for 6), ''),
     'BRD'
   )
 where prefix is null;

-- Pad too-short prefixes to satisfy the 2-char minimum.
update public.boards
   set prefix = rpad(prefix, 2, 'X')
 where length(prefix) < 2;

-- ---------- Constraints ----------

alter table public.cards  alter column number set not null;
alter table public.boards alter column prefix set not null;

-- Format guard. Single regex covers length + character set.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'boards_prefix_format'
  ) then
    alter table public.boards
      add constraint boards_prefix_format check (prefix ~ '^[A-Z0-9]{2,6}$');
  end if;
end $$;

-- Per-board uniqueness for the number. Doubles as the lookup index.
create unique index if not exists cards_board_number_uniq
  on public.cards (board_id, number);

-- ---------- Trigger: auto-assign next number per board ----------
-- BEFORE INSERT so the row carries its number before any constraint check.
-- We let the caller pre-supply `number` (useful for tests / imports) and only
-- fill when null; the unique index keeps things honest.

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

-- ---------- RPC: create_board now also sets the prefix ----------

create or replace function public.create_board(board_name text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_id  uuid;
  derived text;
begin
  derived := coalesce(
    nullif(
      substring(upper(regexp_replace(board_name, '[^A-Za-z0-9]', '', 'g')) from 1 for 6),
      ''
    ),
    'BRD'
  );
  if length(derived) < 2 then
    derived := rpad(derived, 2, 'X');
  end if;

  insert into public.boards (name, prefix, created_by)
  values (board_name, derived, auth.uid())
  returning id into new_id;

  insert into public.board_members (board_id, user_id, role)
  values (new_id, auth.uid(), 'owner');

  insert into public.columns (board_id, title, position) values
    (new_id, 'Backlog',     0),
    (new_id, 'To Do',       1),
    (new_id, 'In Progress', 2),
    (new_id, 'Done',        3);

  return new_id;
end;
$$;
