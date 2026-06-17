-- Card identifiers are rendered as `${board.prefix}-${number}`.
-- The prefix was previously 2–6 chars, producing IDs like `BOARD-12`.
-- Standardize on an exactly-3-char prefix so IDs read `BRD-12`.

-- 1. Normalize every existing prefix to satisfy ^[A-Z0-9]{3}$.
--    Strip non-alphanumerics, uppercase, then size to exactly 3 chars:
--    too-long -> truncate to the first 3; too-short -> right-pad with 'X'.
--    Applied to all rows (not just length mismatches) so legacy 3-char
--    prefixes with lowercase or punctuation are also brought into spec.
update public.boards
   set prefix = rpad(
         substring(upper(regexp_replace(prefix, '[^A-Za-z0-9]', '', 'g')) from 1 for 3),
         3, 'X'
       );

-- 2. Tighten the format constraint to exactly 3 chars.
alter table public.boards drop constraint if exists boards_prefix_format;
alter table public.boards
  add constraint boards_prefix_format check (prefix ~ '^[A-Z0-9]{3}$');

-- 3. Update the default to a 3-char value.
alter table public.boards alter column prefix set default 'BRD';

-- 4. create_board now derives an exactly-3-char prefix.
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
      substring(upper(regexp_replace(board_name, '[^A-Za-z0-9]', '', 'g')) from 1 for 3),
      ''
    ),
    'BRD'
  );
  -- Pad too-short derivations up to the required 3 chars.
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
