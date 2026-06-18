-- =====================================================================
-- 20260618002 — board_member_profiles RPC
-- ---------------------------------------------------------------------
-- The board page previously did two *serial* round-trips per load:
--   1. select user_id, role from board_members where board_id = ?
--   2. select id, full_name, email from profiles where id in (...)
-- because there's no direct FK from board_members.user_id to profiles
-- (it references auth.users), so PostgREST can't embed the profile.
--
-- This RPC joins them in one call so the page fetches members+profiles
-- in a single request, alongside its other board reads in parallel.
--
-- SECURITY DEFINER bypasses RLS, so we gate on is_board_member(b): the
-- function returns rows only when the caller is a member of the board.
-- (auth.uid() is preserved inside a definer function.)
-- =====================================================================

create or replace function public.board_member_profiles(b uuid)
returns table (user_id uuid, role text, full_name text, email text)
language sql
security definer set search_path = public
stable
as $$
  select bm.user_id, bm.role, p.full_name, p.email
    from public.board_members bm
    left join public.profiles p on p.id = bm.user_id
   where bm.board_id = b
     and public.is_board_member(b);
$$;

grant execute on function public.board_member_profiles(uuid) to authenticated;
