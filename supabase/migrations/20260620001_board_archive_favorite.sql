-- QoL: soft-archive boards (reversible) + per-user board favorites.

alter table public.boards
  add column if not exists archived_at timestamptz;

alter table public.board_members
  add column if not exists favorite boolean not null default false;

-- Per-user favourite toggle. board_members deliberately has no UPDATE policy
-- (a blanket one would let a member rewrite their own role), so the favourite
-- flag is flipped through a SECURITY DEFINER RPC scoped to the caller's own row.
create or replace function public.set_board_favorite(board uuid, fav boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.board_members
     set favorite = fav
   where board_id = board and user_id = auth.uid();
end;
$$;

-- Archiving is a plain UPDATE on boards.archived_at, already gated to owners by
-- the existing boards_modify policy. Selecting archived boards is fine for
-- members (boards_read) — the client decides whether to show them.
