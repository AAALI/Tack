-- Fix: "new row for relation \"boards\" violates check constraint
-- \"boards_prefix_format\"" when creating a board.
--
-- The boards_prefix_format constraint was tightened to exactly 3 chars
-- (^[A-Z0-9]{3}$), but a stale create_board() could still derive a longer
-- prefix (e.g. "testing" -> "TESTIN"), tripping the constraint. Re-assert
-- both the constraint and the function so prefix derivation always yields a
-- spec-compliant, exactly-3-char value.

-- 1. Normalize any out-of-spec existing prefixes, then re-assert the constraint.
update public.boards
   set prefix = rpad(
         substring(upper(regexp_replace(prefix, '[^A-Za-z0-9]', '', 'g')) from 1 for 3),
         3, 'X'
       )
 where prefix !~ '^[A-Z0-9]{3}$';

alter table public.boards drop constraint if exists boards_prefix_format;
alter table public.boards
  add constraint boards_prefix_format check (prefix ~ '^[A-Z0-9]{3}$');

alter table public.boards alter column prefix set default 'BRD';

-- 2. Re-create create_board with bulletproof 3-char prefix derivation.
create or replace function public.create_board(board_name text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_id  uuid;
  derived text;
begin
  -- Strip non-alphanumerics, uppercase, take the first 3 chars; fall back to
  -- 'BRD' when nothing usable remains, then right-pad short results to 3.
  derived := coalesce(
    nullif(
      substring(upper(regexp_replace(board_name, '[^A-Za-z0-9]', '', 'g')) from 1 for 3),
      ''
    ),
    'BRD'
  );
  derived := rpad(derived, 3, 'X');

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
