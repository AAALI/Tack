-- =====================================================================
-- 0002 — Profiles visible only to self + co-members
-- ---------------------------------------------------------------------
-- The original `profiles_read` policy let any signed-in user read every
-- profile (full_name + email). That was a deliberate v0 shortcut so the
-- assignee picker could render names. It also leaked the user directory
-- to anyone who signs up.
--
-- Tighten to: you can read a profile if it's yours, OR you share at least
-- one board with that user.
--
-- Implementation: a SECURITY DEFINER helper that bypasses RLS on
-- `board_members` (and so avoids recursion through its own policy).
-- =====================================================================

-- Helper: viewer shares a board with the given user.
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

-- The subselect on b.user_id needs a single-column index; the PK is
-- (board_id, user_id) which doesn't help here.
create index if not exists board_members_user_idx
  on public.board_members (user_id);

-- Replace the open select policy with the scoped one.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_board_with(id));

-- Note: `add_board_member` is SECURITY DEFINER and does its own profile
-- lookup by email — invitations still work for strangers the owner has
-- never met. The policy only governs raw `select` from the app.
